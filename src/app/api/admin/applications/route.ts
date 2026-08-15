import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { ApplicationStatus, type Prisma, type Role } from "@prisma/client";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const role = session.user.role as Role;
        if (!(await hasPermission(role, "application.view"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = request.nextUrl;
        const status = searchParams.get("status");
        const stationId = searchParams.get("stationId");
        const q = searchParams.get("q")?.trim();
        const page = Math.max(1, Number(searchParams.get("page")) || 1);
        const pageSize = 20;

        const where: Prisma.JobApplicationWhereInput = {};

        // MANAGER only ever sees their own station's applications — enforced server-side, not just hidden in UI.
        if (role === "MANAGER" && session.user.stationId) {
            where.stationId = session.user.stationId;
        } else if (stationId) {
            where.stationId = stationId;
        }

        if (status && status !== "ALL" && status in ApplicationStatus) {
            where.status = status as ApplicationStatus;
        }

        if (q) {
            where.OR = [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { nickName: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { refCode: { contains: q, mode: "insensitive" } },
                { positionTitle: { contains: q, mode: "insensitive" } },
            ];
        }

        const countScope: Prisma.JobApplicationWhereInput =
            role === "MANAGER" && session.user.stationId ? { stationId: session.user.stationId } : {};

        const [applications, total, statusGroups] = await Promise.all([
            prisma.jobApplication.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    refCode: true,
                    status: true,
                    positionTitle: true,
                    firstName: true,
                    lastName: true,
                    nickName: true,
                    phone: true,
                    birthDate: true,
                    createdAt: true,
                    ratingScore: true,
                    station: { select: { id: true, name: true } },
                    files: { where: { kind: "PROFILE_PHOTO" }, select: { id: true }, take: 1 },
                },
            }),
            prisma.jobApplication.count({ where }),
            prisma.jobApplication.groupBy({
                by: ["status"],
                where: countScope,
                _count: true,
            }),
        ]);

        const counts: Record<string, number> = {};
        for (const g of statusGroups) counts[g.status] = g._count;

        return NextResponse.json({
            applications: applications.map((a) => ({
                id: a.id,
                refCode: a.refCode,
                status: a.status,
                positionTitle: a.positionTitle,
                name: `${a.firstName} ${a.lastName}`.trim(),
                nickName: a.nickName,
                phone: a.phone,
                birthDate: a.birthDate,
                createdAt: a.createdAt,
                ratingScore: a.ratingScore,
                station: a.station,
                hasPhoto: a.files.length > 0,
            })),
            total,
            page,
            pageSize,
            counts,
        });
    } catch (error) {
        console.error("Error listing applications:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
