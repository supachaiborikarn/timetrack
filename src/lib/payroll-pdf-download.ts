import { sanitizeDocumentPart } from "@/lib/payroll-document-settings";
import type { CompanyInfo, PayslipPdfData } from "@/lib/pdf-generator";

function createDocumentFilename(type: "PAYSLIP" | "RECEIPT", payslip: PayslipPdfData) {
    const prefix = type === "RECEIPT" ? "payment-receipt" : "payslip";
    const filename = [
        prefix,
        sanitizeDocumentPart(payslip.user.employeeId, "employee"),
        sanitizeDocumentPart(payslip.period.name || "payroll", "payroll"),
    ].join("_");
    return `${filename}.pdf`;
}

function downloadBlob(buffer: ArrayBuffer, filename: string) {
    const blob = new Blob([buffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

async function generatePdfInFreshWorker(
    type: "PAYSLIP" | "RECEIPT",
    payslip: PayslipPdfData,
    companyInfo: CompanyInfo,
) {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
        throw new Error("PDF_WORKER_UNAVAILABLE");
    }
    const filename = createDocumentFilename(type, payslip);

    await new Promise<void>((resolve, reject) => {
        const worker = new Worker(
            new URL("../workers/payroll-pdf.worker.ts", import.meta.url),
            { type: "module" },
        );
        const timeout = window.setTimeout(() => {
            worker.terminate();
            reject(new Error("PDF_GENERATION_TIMEOUT"));
        }, 30_000);

        worker.onmessage = (event: MessageEvent<{ buffer?: ArrayBuffer; error?: string }>) => {
            window.clearTimeout(timeout);
            worker.terminate();
            if (event.data.error || !event.data.buffer) {
                reject(new Error(event.data.error || "PDF_GENERATION_FAILED"));
                return;
            }
            downloadBlob(event.data.buffer, filename);
            resolve();
        };
        worker.onerror = (event) => {
            window.clearTimeout(timeout);
            worker.terminate();
            reject(new Error(event.message || "PDF_WORKER_FAILED"));
        };
        worker.postMessage({ type, payslip, companyInfo });
    });
}

export async function generatePayslipPDF(payslip: PayslipPdfData, companyInfo: CompanyInfo) {
    await generatePdfInFreshWorker("PAYSLIP", payslip, companyInfo);
}

export async function generatePaymentReceiptPDF(payslip: PayslipPdfData, companyInfo: CompanyInfo) {
    if (String(payslip.paymentStatus).toUpperCase() !== "PAID") {
        throw new Error("PAYMENT_NOT_PAID");
    }
    await generatePdfInFreshWorker("RECEIPT", payslip, companyInfo);
}
