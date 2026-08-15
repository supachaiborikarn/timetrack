import { prisma } from "@/lib/prisma";
import { getPayrollDocumentSettings } from "@/lib/server/payroll-document-settings";
import { createFormToken } from "@/lib/form-token";
import { ApplyForm } from "./apply-form";

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
    const [stations, documentSettings] = await Promise.all([
        prisma.station.findMany({
            where: { isActive: true },
            select: { id: true, name: true, departments: { select: { id: true, name: true } } },
            orderBy: { name: "asc" },
        }),
        getPayrollDocumentSettings(),
    ]);

    const companyName = documentSettings.legalName || documentSettings.displayName;
    const formToken = createFormToken();

    return <ApplyForm stations={stations} companyName={companyName} formToken={formToken} />;
}
