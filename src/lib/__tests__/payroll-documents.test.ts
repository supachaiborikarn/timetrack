import { describe, expect, it } from "vitest";
import {
    createPayrollDocumentNumbers,
    maskBankAccountNumber,
    normalizeBankAccountNumber,
    normalizePayrollDocumentSettings,
    sanitizeDocumentPart,
} from "@/lib/payroll-document-settings";
import {
    createPaymentReceiptPdfDocument,
    createPayslipPdfDocument,
    thaiBahtText,
    type PayslipPdfData,
} from "@/lib/pdf-generator";

const companyInfo = normalizePayrollDocumentSettings({
    displayName: "TimeTrack",
    legalName: "บริษัท ทดสอบระบบ จำกัด",
    address: "99 ถนนทดสอบ ตำบลตัวอย่าง อำเภอเมือง จังหวัดกำแพงเพชร 62000",
    taxId: "0123456789012",
    branch: "สำนักงานใหญ่",
    phone: "055-000-000",
    email: "payroll@example.com",
    authorizedSigner: "ผู้อนุมัติ ตัวอย่าง",
    authorizedTitle: "กรรมการ",
});

const payslip: PayslipPdfData = {
    id: "record-1",
    documentNumber: "PS-202606-EMP001",
    receiptNumber: "PR-202606-EMP001",
    user: {
        name: "พนักงาน ทดสอบระบบ",
        employeeId: "EMP001",
        station: { name: "สถานีทดสอบ" },
        department: { name: "ฝ่ายปฏิบัติการ" },
        bankName: "ธนาคารทดสอบ",
        bankAccountNumber: "1234567890.0",
    },
    period: {
        name: "Payroll 06/2026",
        startDate: "2026-06-01T00:00:00.000Z",
        endDate: "2026-06-30T00:00:00.000Z",
        payDate: "2026-07-01T00:00:00.000Z",
        status: "FINALIZED",
    },
    createdAt: "2026-07-01T00:00:00.000Z",
    workDays: 24.5,
    totalHours: 196,
    overtimeHours: 8,
    dailyRate: 500,
    basePay: 12250,
    overtimePay: 750,
    latePenalty: 50,
    advanceDeduct: 1000,
    otherDeduct: 100,
    socialSecurity: 650,
    adjustment: 200,
    specialIncome: 500,
    netPay: 11900,
    paymentStatus: "PAID",
    paymentMethod: "BANK_TRANSFER",
    paidAt: "2026-07-01T05:00:00.000Z",
    paymentReference: "BATCH-20260701-001",
    paymentNote: "จ่ายตามรอบปกติ",
};

describe("payroll document helpers", () => {
    it("cleans spreadsheet-style bank account values and masks them", () => {
        expect(normalizeBankAccountNumber("7852186571.0")).toBe("7852186571");
        expect(maskBankAccountNumber("7852186571.0")).toBe("••••••6571");
    });

    it("creates stable document numbers and safe filenames", () => {
        expect(createPayrollDocumentNumbers({
            periodEndDate: "2026-06-30T00:00:00.000Z",
            employeeCode: "EMP/001",
        })).toEqual({
            documentNumber: "PS-202606-EMP-001",
            receiptNumber: "PR-202606-EMP-001",
        });
        expect(sanitizeDocumentPart("Payroll 06/2026")).toBe("Payroll-06-2026");
    });

    it("writes Thai baht text including satang", () => {
        expect(thaiBahtText(0)).toBe("ศูนย์บาทถ้วน");
        expect(thaiBahtText(21)).toBe("ยี่สิบเอ็ดบาทถ้วน");
        expect(thaiBahtText(1_234_567.25)).toBe("หนึ่งล้านสองแสนสามหมื่นสี่พันห้าร้อยหกสิบเจ็ดบาทยี่สิบห้าสตางค์");
    });
});

describe("payroll PDF generation", () => {
    it("creates a one-page payslip PDF", () => {
        const document = createPayslipPdfDocument(payslip, companyInfo);
        expect(document.getNumberOfPages()).toBe(1);
        expect(document.output("arraybuffer").byteLength).toBeGreaterThan(50_000);
    });

    it("creates a one-page payment receipt PDF", () => {
        const document = createPaymentReceiptPdfDocument(payslip, companyInfo);
        expect(document.getNumberOfPages()).toBe(1);
        expect(document.output("arraybuffer").byteLength).toBeGreaterThan(50_000);
    });
});
