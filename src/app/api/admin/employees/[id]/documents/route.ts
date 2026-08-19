import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveViewer } from "@/lib/assets";
import { ASSET_KIND_META, assetUrl, canViewAsset, VAULT_DOCUMENT_KINDS } from "@/lib/asset-kinds";

/**
 * The employee document vault. Reaching it at all needs `employee_document.view`
 * (an employee always reaches their own). Within that, rows the caller isn't cleared
 * to see — ID copies, passports and the like need `employee_document.view_sensitive`
 * — are filtered out server-side, and only their number is reported, so HR without
 * the sensitive grant can still tell that a document is on file.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const employee = await prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true, employeeId: true, stationId: true },
        });
        if (!employee) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });

        const viewer = await resolveViewer({ id: session.user.id, role: session.user.role, stationId: session.user.stationId });

        // Gate the whole listing, not just the rows: otherwise `hiddenCount` would tell
        // someone with no permission at all how many documents an employee has.
        const isOwnVault = viewer.userId === employee.id;
        if (!isOwnVault && !viewer.can("employee_document.view")) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ดูเอกสารพนักงาน" }, { status: 403 });
        }

        const documents = await prisma.storedAsset.findMany({
            where: { ownerUserId: id, kind: { in: VAULT_DOCUMENT_KINDS } },
            orderBy: [{ documentExpiresAt: "asc" }, { createdAt: "desc" }],
            select: {
                id: true,
                kind: true,
                fileName: true,
                note: true,
                sizeBytes: true,
                documentExpiresAt: true,
                createdAt: true,
                ownerUserId: true,
                uploadedById: true,
                uploadedBy: { select: { name: true } },
            },
        });

        const visible = documents.filter(
            (doc) =>
                canViewAsset(
                    { kind: doc.kind, ownerUserId: doc.ownerUserId, uploadedById: doc.uploadedById, ownerStationId: employee.stationId },
                    viewer
                ).allowed
        );

        return NextResponse.json({
            employee: { id: employee.id, name: employee.name, employeeId: employee.employeeId },
            hiddenCount: documents.length - visible.length,
            documents: visible.map((doc) => ({
                id: doc.id,
                kind: doc.kind,
                kindLabel: ASSET_KIND_META[doc.kind].label,
                fileName: doc.fileName,
                note: doc.note,
                sizeBytes: doc.sizeBytes,
                documentExpiresAt: doc.documentExpiresAt,
                createdAt: doc.createdAt,
                uploadedByName: doc.uploadedBy?.name ?? null,
                url: assetUrl(doc.id),
                thumbUrl: assetUrl(doc.id, "thumb"),
            })),
        });
    } catch (error) {
        console.error("Error listing employee documents:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
