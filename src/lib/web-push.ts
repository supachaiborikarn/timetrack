/**
 * Server-side Web Push utility
 * Uses web-push library with VAPID keys to send push notifications
 */

import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

// Configure VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@timetrack.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export function isWebPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface PushResult {
  userId: string;
  success: boolean;
  subscriptionsCleaned: number;
}

/**
 * Send push notification to a single user (all their subscriptions)
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  if (!isWebPushConfigured()) {
    console.warn('[web-push] VAPID keys not configured. Skipping push.');
    return { userId, success: false, subscriptionsCleaned: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { userId, success: false, subscriptionsCleaned: 0 };
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/notifications',
    tag: payload.tag || 'timetrack-notification',
    data: payload.data || {},
  });

  let successCount = 0;
  let cleanedCount = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        pushPayload
      );
      successCount++;
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      // 404 or 410 means subscription expired/invalid — clean it up
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.delete({
          where: { id: sub.id },
        });
        cleanedCount++;
        console.log(`[web-push] Cleaned expired subscription ${sub.id} for user ${userId}`);
      } else {
        console.error(`[web-push] Failed to send to subscription ${sub.id}:`, error);
      }
    }
  }

  return {
    userId,
    success: successCount > 0,
    subscriptionsCleaned: cleanedCount,
  };
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<PushResult[]> {
  const results = await Promise.allSettled(
    userIds.map((userId) => sendPushToUser(userId, payload))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      userId: userIds[index],
      success: false,
      subscriptionsCleaned: 0,
    };
  });
}

/**
 * Send push notification to all users in a specific department at a station
 */
export async function sendPushToDepartment(
  stationId: string,
  deptCode: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number; cleaned: number; userIds: string[] }> {
  // Find the department
  const department = await prisma.department.findFirst({
    where: {
      stationId,
      code: deptCode,
    },
  });

  if (!department) {
    console.warn(`[web-push] Department ${deptCode} not found at station ${stationId}`);
    return { sent: 0, failed: 0, cleaned: 0, userIds: [] };
  }

  // Find active users in this department who have push subscriptions
  const users = await prisma.user.findMany({
    where: {
      departmentId: department.id,
      stationId,
      isActive: true,
      pushSubscriptions: {
        some: {}, // Only users with at least one subscription
      },
    },
    select: { id: true, name: true },
  });

  if (users.length === 0) {
    console.log(`[web-push] No subscribed users in dept ${deptCode} at station ${stationId}`);
    return { sent: 0, failed: 0, cleaned: 0, userIds: [] };
  }

  const userIds = users.map((u) => u.id);
  const results = await sendPushToUsers(userIds, payload);

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const cleaned = results.reduce((sum, r) => sum + r.subscriptionsCleaned, 0);

  console.log(
    `[web-push] Sent to dept ${deptCode}: ${sent} success, ${failed} failed, ${cleaned} cleaned`
  );

  return { sent, failed, cleaned, userIds };
}
