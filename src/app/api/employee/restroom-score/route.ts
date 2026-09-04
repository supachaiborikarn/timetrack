import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isHousekeepingDepartment } from "@/lib/attendance-rules";
import { RESTROOM_CLEANLINESS_QUESTION_KEYS } from "@/lib/customer-feedback/questions";
import { isRestroomScoreEligibleHousekeeper, summarizeRestroomScore } from "@/lib/customer-feedback/restroom-score";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employee = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            name: true,
            nickName: true,
            isActive: true,
            department: { select: { code: true, name: true } },
            station: { select: { code: true } },
        },
    });
    if (
        !employee?.isActive ||
        !isHousekeepingDepartment(employee.department) ||
        !isRestroomScoreEligibleHousekeeper({
            stationCode: employee.station?.code ?? null,
            name: employee.name,
            nickName: employee.nickName,
        })
    ) {
        return NextResponse.json({ applicable: false });
    }

    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const responses = await prisma.customerFeedbackResponse.findMany({
        where: {
            kind: "STANDARD",
            targetType: "STATION",
            surveyVersion: "restroom-v1",
            validity: "VALID",
            employeeId: employee.id,
            submittedAt: { gte: from, lt: now },
        },
        orderBy: { submittedAt: "asc" },
        select: {
            id: true,
            overallRating: true,
            answers: {
                where: { questionKey: { in: [...RESTROOM_CLEANLINESS_QUESTION_KEYS] } },
                select: { questionKey: true, choiceValues: true },
            },
        },
    });

    const summary = summarizeRestroomScore(responses.flatMap((response) => {
        if (response.overallRating === null) return [];
        return [{
            responseId: response.id,
            overallRating: response.overallRating,
            answers: response.answers.flatMap((answer) => {
                const value = answer.choiceValues[0];
                return value === "YES" || value === "NO" || value === "UNSURE"
                    ? [{ questionKey: answer.questionKey, answer: value }]
                    : [];
            }),
        }];
    }));

    const response = NextResponse.json({
        applicable: true,
        period: "LAST_30_DAYS",
        status: summary.meetsMinimumSample && summary.score !== null ? "READY" : "COLLECTING",
        score: summary.meetsMinimumSample ? summary.score : null,
        overallPoints: summary.meetsMinimumSample ? summary.overallPoints : null,
        checklistPoints: summary.meetsMinimumSample ? summary.checklistPoints : null,
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
}
