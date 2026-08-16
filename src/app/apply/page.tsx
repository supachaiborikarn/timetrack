import { prisma } from "@/lib/prisma";
import { getPayrollDocumentSettings } from "@/lib/server/payroll-document-settings";
import { createFormToken } from "@/lib/form-token";
import { isOpeningOpen } from "@/lib/job-opening";
import { ApplyForm } from "./apply-form";

export const dynamic = "force-dynamic";

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ opening?: string }> }) {
    const { opening: openingSlug } = await searchParams;

    const [stations, documentSettings, opening] = await Promise.all([
        prisma.station.findMany({
            where: { isActive: true },
            select: { id: true, name: true, departments: { select: { id: true, name: true } } },
            orderBy: { name: "asc" },
        }),
        getPayrollDocumentSettings(),
        openingSlug
            ? prisma.jobOpening.findUnique({
                where: { slug: openingSlug },
                select: {
                    id: true, slug: true, title: true, employmentType: true,
                    stationId: true, departmentId: true, isActive: true, closesAt: true,
                },
            })
            : null,
    ]);

    const companyName = documentSettings.legalName || documentSettings.displayName;
    const formToken = createFormToken();
    // A closed posting must not keep accepting applications through a stale link.
    const activeOpening = opening && isOpeningOpen(opening) ? opening : null;

    return (
        <ApplyForm
            stations={stations}
            companyName={companyName}
            formToken={formToken}
            opening={activeOpening
                ? {
                    id: activeOpening.id,
                    slug: activeOpening.slug,
                    title: activeOpening.title,
                    employmentType: activeOpening.employmentType,
                    stationId: activeOpening.stationId,
                    departmentId: activeOpening.departmentId,
                }
                : null}
            openingClosed={Boolean(opening && !activeOpening)}
        />
    );
}
