import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAsset, resolveViewer } from "@/lib/assets";
import { ASSET_KIND_META, canDeleteAsset, canViewAsset } from "@/lib/asset-kinds";
import { serveAsset } from "@/lib/server/serve-asset";
import { logActivity } from "@/lib/logger";

/** Loads an asset together with the one field the access rules need beyond the row itself. */
async function loadAsset(id: string) {
    return prisma.storedAsset.findUnique({
        where: { id },
        select: {
            id: true,
            kind: true,
            mimeType: true,
            sizeBytes: true,
            storageDriver: true,
            storageKey: true,
            ownerUserId: true,
            uploadedById: true,
            owner: { select: { name: true, stationId: true } },
        },
    });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const asset = await loadAsset(id);
        if (!asset) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 404 });

        const viewer = await resolveViewer({ id: session.user.id, role: session.user.role, stationId: session.user.stationId });
        const decision = canViewAsset(
            { kind: asset.kind, ownerUserId: asset.ownerUserId, uploadedById: asset.uploadedById, ownerStationId: asset.owner?.stationId ?? null },
            viewer
        );
        if (!decision.allowed) return NextResponse.json({ error: "ไม่มีสิทธิ์ดูไฟล์นี้" }, { status: 403 });

        if (decision.auditSensitiveRead) {
            await logActivity(
                session.user.id,
                "VIEW_SENSITIVE",
                "User",
                `ดู${ASSET_KIND_META[asset.kind].label} ของ ${asset.owner?.name ?? "-"}`,
                asset.ownerUserId ?? undefined
            );
        }

        return serveAsset(asset, { thumb: request.nextUrl.searchParams.get("t") === "thumb" });
    } catch (error) {
        console.error("Error serving asset:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const asset = await loadAsset(id);
        if (!asset) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 404 });

        const viewer = await resolveViewer({ id: session.user.id, role: session.user.role, stationId: session.user.stationId });
        const allowed = canDeleteAsset(
            { kind: asset.kind, ownerUserId: asset.ownerUserId, uploadedById: asset.uploadedById, ownerStationId: asset.owner?.stationId ?? null },
            viewer
        );
        if (!allowed) return NextResponse.json({ error: "ไม่มีสิทธิ์ลบไฟล์นี้" }, { status: 403 });

        await deleteAsset(asset);

        // The avatar URL is derived, so it has to be cleared by hand once the only
        // photo is gone — otherwise every list would request a photo that 404s.
        if (asset.kind === "EMPLOYEE_PHOTO" && asset.ownerUserId) {
            const remaining = await prisma.storedAsset.count({
                where: { ownerUserId: asset.ownerUserId, kind: "EMPLOYEE_PHOTO" },
            });
            if (remaining === 0) {
                await prisma.user.update({ where: { id: asset.ownerUserId }, data: { photoUrl: null } });
            }
        }

        if (ASSET_KIND_META[asset.kind].vault) {
            await logActivity(
                session.user.id,
                "DELETE_DOCUMENT",
                "User",
                `ลบ${ASSET_KIND_META[asset.kind].label} ของ ${asset.owner?.name ?? "-"}`,
                asset.ownerUserId ?? undefined
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting asset:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
