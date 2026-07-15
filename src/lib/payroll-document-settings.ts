export interface PayrollDocumentSettings {
    displayName: string;
    legalName: string;
    address: string;
    taxId: string;
    branch: string;
    phone: string;
    email: string;
    logoDataUrl: string;
    authorizedSigner: string;
    authorizedTitle: string;
    payslipPrefix: string;
    receiptPrefix: string;
}

export const DEFAULT_PAYROLL_DOCUMENT_SETTINGS: PayrollDocumentSettings = {
    displayName: "TimeTrack",
    legalName: "",
    address: "",
    taxId: "",
    branch: "สำนักงานใหญ่",
    phone: "",
    email: "",
    logoDataUrl: "",
    authorizedSigner: "",
    authorizedTitle: "ผู้มีอำนาจอนุมัติ",
    payslipPrefix: "PS",
    receiptPrefix: "PR",
};

export const PAYROLL_DOCUMENT_SETTING_KEYS = {
    displayName: "payroll_document_display_name",
    legalName: "payroll_document_legal_name",
    address: "payroll_document_address",
    taxId: "payroll_document_tax_id",
    branch: "payroll_document_branch",
    phone: "payroll_document_phone",
    email: "payroll_document_email",
    logoDataUrl: "payroll_document_logo_data_url",
    authorizedSigner: "payroll_document_authorized_signer",
    authorizedTitle: "payroll_document_authorized_title",
    payslipPrefix: "payroll_document_payslip_prefix",
    receiptPrefix: "payroll_document_receipt_prefix",
} as const satisfies Record<keyof PayrollDocumentSettings, string>;

const FIELD_LIMITS: Record<keyof PayrollDocumentSettings, number> = {
    displayName: 80,
    legalName: 180,
    address: 500,
    taxId: 30,
    branch: 80,
    phone: 40,
    email: 120,
    logoDataUrl: 700_000,
    authorizedSigner: 120,
    authorizedTitle: 120,
    payslipPrefix: 8,
    receiptPrefix: 8,
};

function cleanText(value: unknown, maxLength: number) {
    return String(value ?? "").trim().slice(0, maxLength);
}

function cleanPrefix(value: unknown, fallback: string) {
    const prefix = cleanText(value, 8)
        .toUpperCase()
        .replace(/[^A-Z0-9ก-๙]/g, "");
    return prefix || fallback;
}

function cleanLogoDataUrl(value: unknown) {
    const logo = cleanText(value, FIELD_LIMITS.logoDataUrl);
    if (!logo) return "";
    if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(logo)) return "";
    return logo;
}

export function normalizePayrollDocumentSettings(
    partial: Partial<PayrollDocumentSettings>,
): PayrollDocumentSettings {
    return {
        displayName: cleanText(partial.displayName, FIELD_LIMITS.displayName)
            || DEFAULT_PAYROLL_DOCUMENT_SETTINGS.displayName,
        legalName: cleanText(partial.legalName, FIELD_LIMITS.legalName),
        address: cleanText(partial.address, FIELD_LIMITS.address),
        taxId: cleanText(partial.taxId, FIELD_LIMITS.taxId),
        branch: cleanText(partial.branch, FIELD_LIMITS.branch)
            || DEFAULT_PAYROLL_DOCUMENT_SETTINGS.branch,
        phone: cleanText(partial.phone, FIELD_LIMITS.phone),
        email: cleanText(partial.email, FIELD_LIMITS.email),
        logoDataUrl: cleanLogoDataUrl(partial.logoDataUrl),
        authorizedSigner: cleanText(partial.authorizedSigner, FIELD_LIMITS.authorizedSigner),
        authorizedTitle: cleanText(partial.authorizedTitle, FIELD_LIMITS.authorizedTitle)
            || DEFAULT_PAYROLL_DOCUMENT_SETTINGS.authorizedTitle,
        payslipPrefix: cleanPrefix(
            partial.payslipPrefix,
            DEFAULT_PAYROLL_DOCUMENT_SETTINGS.payslipPrefix,
        ),
        receiptPrefix: cleanPrefix(
            partial.receiptPrefix,
            DEFAULT_PAYROLL_DOCUMENT_SETTINGS.receiptPrefix,
        ),
    };
}

export function hasCompletePayrollCompanyInfo(settings: PayrollDocumentSettings) {
    return Boolean(settings.legalName && settings.address && settings.taxId);
}

export function normalizeBankAccountNumber(value?: string | null) {
    return String(value ?? "")
        .trim()
        .replace(/\.0+$/, "")
        .replace(/\s+/g, "");
}

export function maskBankAccountNumber(value?: string | null) {
    const normalized = normalizeBankAccountNumber(value);
    if (!normalized) return "-";
    if (normalized.length <= 4) return normalized;
    return `${"•".repeat(Math.min(6, normalized.length - 4))}${normalized.slice(-4)}`;
}

export function sanitizeDocumentPart(value: string, fallback = "document") {
    const sanitized = value
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    return sanitized || fallback;
}

export function createPayrollDocumentNumbers({
    periodEndDate,
    employeeCode,
    payslipPrefix = DEFAULT_PAYROLL_DOCUMENT_SETTINGS.payslipPrefix,
    receiptPrefix = DEFAULT_PAYROLL_DOCUMENT_SETTINGS.receiptPrefix,
}: {
    periodEndDate: Date | string;
    employeeCode: string;
    payslipPrefix?: string;
    receiptPrefix?: string;
}) {
    const date = new Date(periodEndDate);
    const yearMonth = Number.isNaN(date.getTime())
        ? "000000"
        : `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const code = sanitizeDocumentPart(employeeCode, "EMP").toUpperCase();
    return {
        documentNumber: `${cleanPrefix(payslipPrefix, "PS")}-${yearMonth}-${code}`,
        receiptNumber: `${cleanPrefix(receiptPrefix, "PR")}-${yearMonth}-${code}`,
    };
}
