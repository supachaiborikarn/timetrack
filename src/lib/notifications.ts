import { prisma } from "@/lib/prisma";

type NotificationType =
    | "SHIFT_REMINDER"
    | "REQUEST_PENDING"
    | "ANNOUNCEMENT"
    | "SWAP_REQUEST"
    | "APPROVAL";

interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
    try {
        return await prisma.notification.create({
            data: {
                userId: params.userId,
                type: params.type,
                title: params.title,
                message: params.message,
                link: params.link || null,
            },
        });
    } catch (error) {
        console.error("Failed to create notification:", error);
        return null;
    }
}

/**
 * Create notifications for multiple users
 */
export async function createNotifications(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    link?: string
) {
    try {
        return await prisma.notification.createMany({
            data: userIds.map((userId) => ({
                userId,
                type,
                title,
                message,
                link: link || null,
            })),
        });
    } catch (error) {
        console.error("Failed to create notifications:", error);
        return null;
    }
}

/**
 * Notify targets when they receive a swap request
 */
export async function notifySwapRequest(
    targetId: string,
    requesterName: string,
    requesterDate: string,
    targetDate: string
) {
    return createNotification({
        userId: targetId,
        type: "SWAP_REQUEST",
        title: "คำขอแลกกะ",
        message: `${requesterName} ขอแลกกะวันที่ ${requesterDate} กับวันที่ ${targetDate} ของคุณ`,
        link: "/requests/incoming",
    });
}

/**
 * Notify requester when swap is approved/rejected
 */
export async function notifySwapResult(
    requesterId: string,
    targetName: string,
    approved: boolean
) {
    return createNotification({
        userId: requesterId,
        type: "APPROVAL",
        title: approved ? "อนุมัติแลกกะ" : "ปฏิเสธแลกกะ",
        message: approved
            ? `การขอแลกกะกับ ${targetName} ได้รับการอนุมัติแล้ว`
            : `การขอแลกกะกับ ${targetName} ถูกปฏิเสธ`,
        link: "/requests/shift-swap",
    });
}

/**
 * Notify when a new announcement is posted
 */
export async function notifyAnnouncement(
    userIds: string[],
    announcementTitle: string,
    announcementId: string
) {
    return createNotifications(
        userIds,
        "ANNOUNCEMENT",
        "ประกาศใหม่",
        announcementTitle,
        `/announcements/${announcementId}`
    );
}

/**
 * Notify managers when there's a pending request
 */
export async function notifyPendingRequest(
    managerIds: string[],
    requestType: string,
    employeeName: string
) {
    return createNotifications(
        managerIds,
        "REQUEST_PENDING",
        `${requestType}รอการอนุมัติ`,
        `${employeeName} ส่ง${requestType}รอการอนุมัติ`,
        "/admin/requests"
    );
}
