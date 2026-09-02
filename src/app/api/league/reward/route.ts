import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rewardOptionsForAwardType } from "@/lib/competition/league";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null) as { awardId?: string; rewardCode?: string } | null;
    if (!body?.awardId || !body.rewardCode) {
        return NextResponse.json({ error: "awardId and rewardCode are required" }, { status: 400 });
    }

    const award = await prisma.competitionAward.findFirst({
        where: { id: body.awardId, userId: session.user.id },
    });
    if (!award) return NextResponse.json({ error: "Award not found" }, { status: 404 });
    if (award.status !== "AVAILABLE") {
        return NextResponse.json({ error: "Reward has already been selected" }, { status: 409 });
    }

    const option = rewardOptionsForAwardType(award.awardType).find((item) => item.code === body.rewardCode);
    if (!option) return NextResponse.json({ error: "Invalid reward option" }, { status: 400 });

    const selectedAt = new Date();
    const claimed = await prisma.competitionAward.updateMany({
        where: { id: award.id, userId: session.user.id, status: "AVAILABLE" },
        data: {
            rewardCode: option.code,
            rewardLabel: option.label,
            rewardValueBaht: option.valueBaht,
            status: "SELECTED",
            selectedAt,
        },
    });
    if (claimed.count !== 1) {
        return NextResponse.json({ error: "Reward has already been selected" }, { status: 409 });
    }
    const updated = await prisma.competitionAward.findUniqueOrThrow({ where: { id: award.id } });

    await prisma.notification.create({
        data: {
            userId: session.user.id,
            type: "COMPETITION_REWARD",
            title: "🎁 เลือกรางวัลเรียบร้อยแล้ว",
            message: `${option.label} — รอผู้ดูแลยืนยันการมอบรางวัล`,
            link: "/league",
            eventKey: `competition-reward:${award.id}`,
        },
    }).catch(() => undefined);

    return NextResponse.json({
        ok: true,
        award: {
            id: updated.id,
            status: updated.status,
            rewardCode: updated.rewardCode,
            rewardLabel: updated.rewardLabel,
            rewardValueBaht: updated.rewardValueBaht,
        },
    });
}
