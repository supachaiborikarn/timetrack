import {
    createPaymentReceiptPdfDocument,
    createPayslipPdfDocument,
    type CompanyInfo,
    type PayslipPdfData,
} from "../lib/pdf-generator";

interface PayrollPdfWorkerRequest {
    type: "PAYSLIP" | "RECEIPT";
    payslip: PayslipPdfData;
    companyInfo: CompanyInfo;
}

self.onmessage = (event: MessageEvent<PayrollPdfWorkerRequest>) => {
    try {
        const { type, payslip, companyInfo } = event.data;
        const document = type === "RECEIPT"
            ? createPaymentReceiptPdfDocument(payslip, companyInfo)
            : createPayslipPdfDocument(payslip, companyInfo);
        const buffer = document.output("arraybuffer");
        self.postMessage({ buffer }, { transfer: [buffer] });
    } catch (error) {
        self.postMessage({
            error: error instanceof Error ? error.message : "PDF_GENERATION_FAILED",
        });
    }
};

export {};
