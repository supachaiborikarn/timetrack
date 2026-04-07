/**
 * POST /api/push/send
 * 
 * Public API endpoint for external systems (e.g., FuelStation) to send
 * push notifications to Timetrack users.
 * 
 * Authentication: X-API-Key header
 * 
 * Body:
 * {
 *   type: "STAFF_SHORTAGE" | "GENERAL",
 *   stationCode: "WKO",         // Station code in Timetrack
 *   targetDeptCode: "OIL_PIT",  // Department code to notify
 *   title: "🚨 คนหน้าลานไม่พอ",
 *   body: "สาขาวัชรเกียรติ พนักงานหน้าลาน ≤ 2 คน",
 *   url: "/notifications",       // optional
 *   tag: "staff-shortage",        // optional, for notification grouping
 *   data: {}                      // optional metadata
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToDepartment, sendPushToUsers, isWebPushConfigured } from '@/lib/web-push';

const PUSH_API_KEY = process.env.PUSH_API_KEY || '';

function validateApiKey(request: NextRequest): boolean {
  if (!PUSH_API_KEY) {
    return false;
  }
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key');
  return apiKey === PUSH_API_KEY;
}

interface PushSendBody {
  type?: string;
  stationCode?: string;
  targetDeptCode?: string;
  targetUserIds?: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Check web-push configuration
    if (!isWebPushConfigured()) {
      return NextResponse.json(
        { error: 'Web Push not configured (VAPID keys missing)' },
        { status: 503 }
      );
    }

    const body = (await request.json()) as PushSendBody;

    // Validate required fields
    if (!body.title || !body.body) {
      return NextResponse.json(
        { error: 'Missing required fields: title, body' },
        { status: 400 }
      );
    }

    const payload = {
      title: body.title,
      body: body.body,
      url: body.url || '/notifications',
      tag: body.tag || `push-${body.type || 'general'}`,
      data: body.data || {},
    };

    let result;

    // Route 1: Send to specific user IDs
    if (body.targetUserIds && body.targetUserIds.length > 0) {
      const pushResults = await sendPushToUsers(body.targetUserIds, payload);
      result = {
        mode: 'users',
        sent: pushResults.filter((r) => r.success).length,
        failed: pushResults.filter((r) => !r.success).length,
        cleaned: pushResults.reduce((sum, r) => sum + r.subscriptionsCleaned, 0),
      };
    }
    // Route 2: Send to department at station
    else if (body.stationCode && body.targetDeptCode) {
      // Resolve station by code
      const station = await prisma.station.findFirst({
        where: { code: body.stationCode, isActive: true },
      });

      if (!station) {
        return NextResponse.json(
          { error: `Station not found: ${body.stationCode}` },
          { status: 404 }
        );
      }

      result = {
        mode: 'department',
        stationCode: body.stationCode,
        deptCode: body.targetDeptCode,
        ...(await sendPushToDepartment(station.id, body.targetDeptCode, payload)),
      };
    }
    // Invalid request
    else {
      return NextResponse.json(
        { error: 'Must provide either targetUserIds or (stationCode + targetDeptCode)' },
        { status: 400 }
      );
    }

    // Also create in-app notifications for the target users
    if (result.userIds && result.userIds.length > 0) {
      await prisma.notification.createMany({
        data: result.userIds.map((userId: string) => ({
          userId,
          type: body.type || 'PUSH',
          title: body.title,
          message: body.body,
          link: body.url || '/notifications',
        })),
      });
    }

    console.log(`[push/send] ${body.type || 'GENERAL'}: ${result.sent} sent, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      type: body.type,
      ...result,
    });
  } catch (error) {
    console.error('[push/send] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
