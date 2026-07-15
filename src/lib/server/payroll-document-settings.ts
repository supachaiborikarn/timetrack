import { prisma } from "@/lib/prisma";
import {
    DEFAULT_PAYROLL_DOCUMENT_SETTINGS,
    normalizePayrollDocumentSettings,
    PAYROLL_DOCUMENT_SETTING_KEYS,
    type PayrollDocumentSettings,
} from "@/lib/payroll-document-settings";

export async function getPayrollDocumentSettings(): Promise<PayrollDocumentSettings> {
    const records = await prisma.systemConfig.findMany({
        where: { key: { in: Object.values(PAYROLL_DOCUMENT_SETTING_KEYS) } },
    });
    const byKey = new Map(records.map((record) => [record.key, record.value]));
    const partial: Partial<PayrollDocumentSettings> = {};

    for (const [name, storageKey] of Object.entries(PAYROLL_DOCUMENT_SETTING_KEYS) as Array<[
        keyof PayrollDocumentSettings,
        string,
    ]>) {
        const value = byKey.get(storageKey);
        if (value !== undefined) partial[name] = value;
    }

    return normalizePayrollDocumentSettings({
        ...DEFAULT_PAYROLL_DOCUMENT_SETTINGS,
        ...partial,
    });
}

export async function savePayrollDocumentSettings(
    partial: Partial<PayrollDocumentSettings>,
): Promise<PayrollDocumentSettings> {
    const normalized = normalizePayrollDocumentSettings({
        ...DEFAULT_PAYROLL_DOCUMENT_SETTINGS,
        ...partial,
    });

    await prisma.$transaction(
        (Object.entries(PAYROLL_DOCUMENT_SETTING_KEYS) as Array<[
            keyof PayrollDocumentSettings,
            string,
        ]>).map(([name, storageKey]) => prisma.systemConfig.upsert({
            where: { key: storageKey },
            update: { value: normalized[name] },
            create: { key: storageKey, value: normalized[name] },
        })),
    );

    return normalized;
}
