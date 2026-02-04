import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function logActivity(
    userId: string,
    action: string,
    entity: string,
    details?: string | object,
    entityId?: string
) {
    try {
        const headersList = await headers();
        const ip = headersList.get("x-forwarded-for") || "unknown";
        const userAgent = headersList.get("user-agent") || "unknown";

        const detailsString = typeof details === "object" ? JSON.stringify(details) : details;

        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entity,
                entityId,
                details: detailsString,
                ipAddress: Array.isArray(ip) ? ip[0] : ip, // Handle potential array from x-forwarded-for
                userAgent,
            },
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
        // Don't throw, we don't want to block the actual action if logging fails
    }
}
