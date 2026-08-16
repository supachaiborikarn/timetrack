import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPayrollDocumentSettings } from "@/lib/server/payroll-document-settings";
import { createFormToken } from "@/lib/form-token";
import { isOpeningOpen } from "@/lib/job-opening";
import { ApplyForm } from "./apply-form";

export const dynamic = "force-dynamic";

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ opening?: string }> }) {
    const { opening: openingSlug } = await searchParams;

    // Applications only start from a job posting, so applicants always see the role's details
    // before filling anything in. An old bare /apply link still works — it just lands on the
    // list of open roles instead of a blank form.
    if (!openingSlug) redirect("/jobs");

    const [stations, documentSettings, opening] = await Promise.all([
        prisma.station.findMany({
            where: { isActive: true },
            select: { id: true, name: true, departments: { select: { id: true, name: true } } },
            orderBy: { name: "asc" },
        }),
        getPayrollDocumentSettings(),
        prisma.jobOpening.findUnique({
            where: { slug: openingSlug },
            select: {
                id: true, slug: true, title: true, employmentType: true,
                stationId: true, departmentId: true, isActive: true, closesAt: true,
            },
        }),
    ]);

    // A stale link to a filled or expired posting shouldn't open a form that can't be submitted —
    // send them back to what's actually open, with a note explaining why.
    if (!opening || !isOpeningOpen(opening)) redirect("/jobs?closed=1");

    const companyName = documentSettings.legalName || documentSettings.displayName;
    const formToken = createFormToken();

    return (
        <ApplyForm
            stations={stations}
            companyName={companyName}
            formToken={formToken}
            opening={{
                id: opening.id,
                slug: opening.slug,
                title: opening.title,
                employmentType: opening.employmentType,
                stationId: opening.stationId,
                departmentId: opening.departmentId,
            }}
        />
    );
}
