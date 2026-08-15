import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { getStorage, type ImageTransform } from "@/lib/storage";
import { logActivity } from "@/lib/logger";
import type { Role } from "@prisma/client";

const THUMB_TRANSFORM: ImageTransform = { crop: "limit", width: 150, height: 150 };

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const role = session.user.role as Role;
        if (!(await hasPermission(role, "application.view"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, fileId } = await params;
        const file = await prisma.jobApplicationFile.findFirst({
            where: { id: fileId, applicationId: id },
            include: { application: { select: { stationId: true, refCode: true } } },
        });
        if (!file || !file.application) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 404 });

        if (role === "MANAGER" && session.user.stationId && file.application.stationId !== session.user.stationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (file.kind === "CITIZEN_ID") {
            if (!(await hasPermission(role, "application.view_sensitive"))) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            await logActivity(session.user.id, "VIEW_SENSITIVE", "JobApplication", `ดูสำเนาบัตรประชาชน: ${file.application.refCode}`, id);
        }

        const variant = request.nextUrl.searchParams.get("t");
        const isThumb = variant === "thumb";
        const storedFile = {
            driver: file.storageDriver as "cloudinary" | "db",
            key: file.storageKey ?? file.id,
            resourceType: "image" as const,
            mimeType: file.mimeType,
            size: file.sizeBytes,
        };

        const storage = getStorage();
        const signedUrl = await storage.signedUrl(storedFile, { ttlSec: 300, transform: isThumb ? THUMB_TRANSFORM : undefined });

        if (signedUrl) {
            return NextResponse.redirect(signedUrl, { status: 307, headers: { "Cache-Control": "private, no-store" } });
        }

        const body = await storage.get(storedFile);
        return new NextResponse(new Uint8Array(body), {
            status: 200,
            headers: {
                "Content-Type": file.mimeType,
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
                "Content-Disposition": "inline",
            },
        });
    } catch (error) {
        console.error("Error serving application file:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
