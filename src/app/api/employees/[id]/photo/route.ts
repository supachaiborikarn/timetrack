import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serveAsset } from "@/lib/server/serve-asset";
import { deleteAsset, resolveViewer } from "@/lib/assets";
import { canDeleteAsset } from "@/lib/asset-kinds";

/**
 * The stable avatar URL stored in `User.photoUrl`. It resolves to whichever photo
 * the employee currently has, so replacing a photo never invalidates a URL that is
 * already cached in a page, a notification or a report.
 *
 * No permission check beyond "signed in": avatars are rendered in every employee
 * list, schedule and announcement thread in the app.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const photo = await prisma.storedAsset.findFirst({
            where: { ownerUserId: id, kind: "EMPLOYEE_PHOTO" },
            orderBy: { createdAt: "desc" },
            select: { id: true, kind: true, mimeType: true, sizeBytes: true, storageDriver: true, storageKey: true },
        });
        if (!photo) return NextResponse.json({ error: "ไม่พบรูปพนักงาน" }, { status: 404 });

        return serveAsset(photo, { thumb: request.nextUrl.searchParams.get("t") === "thumb" });
    } catch (error) {
        console.error("Error serving employee photo:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/** Removes the employee's photo entirely, so lists fall back to their initials again. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const owner = await prisma.user.findUnique({ where: { id }, select: { stationId: true } });
        if (!owner) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });

        const viewer = await resolveViewer({ id: session.user.id, role: session.user.role, stationId: session.user.stationId });
        const allowed = canDeleteAsset(
            { kind: "EMPLOYEE_PHOTO", ownerUserId: id, uploadedById: null, ownerStationId: owner.stationId },
            viewer
        );
        if (!allowed) return NextResponse.json({ error: "ไม่มีสิทธิ์ลบรูปนี้" }, { status: 403 });

        const photos = await prisma.storedAsset.findMany({
            where: { ownerUserId: id, kind: "EMPLOYEE_PHOTO" },
            select: { id: true, mimeType: true, sizeBytes: true, storageDriver: true, storageKey: true },
        });
        for (const photo of photos) await deleteAsset(photo);

        await prisma.user.update({ where: { id }, data: { photoUrl: null } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting employee photo:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
