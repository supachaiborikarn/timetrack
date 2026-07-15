import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { THSarabunRegular } from "@/lib/fonts/thsarabun-regular";
import { THSarabunBold } from "@/lib/fonts/thsarabun-bold";
import {
    maskBankAccountNumber,
    type PayrollDocumentSettings,
} from "@/lib/payroll-document-settings";
import { formatPayrollDate } from "@/lib/payroll-document-format";

export type PayrollPaymentStatus = "PENDING" | "PAID" | "FAILED";
export type PayrollPaymentMethod = "BANK_TRANSFER" | "CASH" | "CHEQUE" | "OTHER";

export interface PayslipPdfData {
    id?: string;
    documentNumber?: string | null;
    receiptNumber?: string | null;
    user: {
        name: string;
        employeeId: string;
        department?: { name?: string | null } | null;
        station?: { name?: string | null } | null;
        bankName?: string | null;
        bankAccountNumber?: string | null;
    };
    period: {
        startDate: string | Date;
        endDate: string | Date;
        payDate?: string | Date;
        name?: string;
        status?: string;
    };
    createdAt: string | Date;
    workDays?: number | string | null;
    totalHours?: number | string | null;
    overtimeHours?: number | string | null;
    dailyRate?: number | string | null;
    basePay: number | string;
    overtimePay: number | string;
    latePenalty: number | string;
    advanceDeduct: number | string;
    otherDeduct: number | string;
    socialSecurity?: number | string | null;
    taxWithheld?: number | string | null;
    adjustment?: number | string | null;
    specialIncome?: number | string | null;
    netPay: number | string;
    paymentStatus?: PayrollPaymentStatus | string | null;
    paymentMethod?: PayrollPaymentMethod | string | null;
    paidAt?: string | Date | null;
    paymentReference?: string | null;
    paymentNote?: string | null;
}

export type CompanyInfo = PayrollDocumentSettings;

type PayrollJsPdf = jsPDF & {
    lastAutoTable?: { finalY: number };
    payrollThaiFont?: string;
};

const COLORS = {
    navy: [25, 42, 70] as [number, number, number],
    blue: [30, 99, 180] as [number, number, number],
    paleBlue: [240, 246, 253] as [number, number, number],
    green: [28, 124, 84] as [number, number, number],
    paleGreen: [236, 249, 242] as [number, number, number],
    red: [181, 56, 56] as [number, number, number],
    paleRed: [253, 242, 242] as [number, number, number],
    amber: [161, 104, 26] as [number, number, number],
    paleAmber: [255, 248, 230] as [number, number, number],
    gray: [99, 112, 129] as [number, number, number],
    paleGray: [247, 249, 251] as [number, number, number],
    border: [218, 225, 233] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
};

let fontInstance = 0;

function setupThaiFont(doc: jsPDF) {
    fontInstance += 1;
    const family = `THSarabunPayroll${fontInstance}`;
    const regularFile = `THSarabunNew-${fontInstance}.ttf`;
    const boldFile = `THSarabunNew-Bold-${fontInstance}.ttf`;
    doc.addFileToVFS(regularFile, THSarabunRegular);
    doc.addFileToVFS(boldFile, THSarabunBold);
    doc.addFont(regularFile, family, "normal");
    doc.addFont(boldFile, family, "bold");
    (doc as PayrollJsPdf).payrollThaiFont = family;
    doc.setFont(family, "normal");
}

function thaiFont(doc: jsPDF) {
    return (doc as PayrollJsPdf).payrollThaiFont || "THSarabun";
}

function setThaiFont(doc: jsPDF, style: "normal" | "bold") {
    doc.setFont(thaiFont(doc), style);
}

function numberValue(value: number | string | null | undefined) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string | null | undefined) {
    return numberValue(value).toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatQuantity(value: number | string | null | undefined, suffix = "") {
    return `${numberValue(value).toLocaleString("th-TH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}${suffix}`;
}

function formatGeneratedAt() {
    return new Intl.DateTimeFormat("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
    }).format(new Date());
}

const THAI_DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const THAI_POSITIONS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function readThaiSixDigits(value: number) {
    const digits = String(Math.floor(value)).padStart(6, "0").split("").map(Number);
    let result = "";
    for (let index = 0; index < digits.length; index += 1) {
        const digit = digits[index];
        const position = digits.length - index - 1;
        if (digit === 0) continue;
        if (position === 1 && digit === 1) {
            result += "สิบ";
        } else if (position === 1 && digit === 2) {
            result += "ยี่สิบ";
        } else if (position === 0 && digit === 1 && value > 10) {
            result += "เอ็ด";
        } else {
            result += `${THAI_DIGITS[digit]}${THAI_POSITIONS[position]}`;
        }
    }
    return result;
}

function readThaiInteger(value: number): string {
    if (value === 0) return THAI_DIGITS[0];
    if (value < 1_000_000) return readThaiSixDigits(value);
    const millions = Math.floor(value / 1_000_000);
    const remainder = value % 1_000_000;
    return `${readThaiInteger(millions)}ล้าน${remainder ? readThaiSixDigits(remainder) : ""}`;
}

export function thaiBahtText(value: number | string) {
    const numericValue = numberValue(value);
    const sign = numericValue < 0 ? "ลบ" : "";
    const totalSatang = Math.round(Math.abs(numericValue) * 100);
    const baht = Math.floor(totalSatang / 100);
    const satang = totalSatang % 100;
    return `${sign}${readThaiInteger(baht)}บาท${satang ? `${readThaiInteger(satang)}สตางค์` : "ถ้วน"}`;
}

function paymentStatusLabel(status?: string | null) {
    if (status === "PAID") return "ชำระแล้ว";
    if (status === "FAILED") return "ชำระไม่สำเร็จ";
    return "รอชำระ";
}

function paymentMethodLabel(method?: string | null) {
    if (method === "CASH") return "เงินสด";
    if (method === "CHEQUE") return "เช็ค";
    if (method === "OTHER") return "วิธีอื่น";
    return "โอนเข้าบัญชีธนาคาร";
}

function addLogo(doc: jsPDF, companyInfo: CompanyInfo) {
    if (companyInfo.logoDataUrl) {
        try {
            const format = companyInfo.logoDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
            doc.addImage(companyInfo.logoDataUrl, format, 14, 14, 18, 18, undefined, "FAST");
            return;
        } catch (error) {
            console.warn("Unable to render company logo in PDF:", error);
        }
    }

    doc.setFillColor(...COLORS.blue);
    doc.roundedRect(14, 14, 18, 18, 3, 3, "F");
    doc.setTextColor(...COLORS.white);
    setThaiFont(doc, "bold");
    doc.setFontSize(15);
    const monogram = companyInfo.displayName.replace(/\s+/g, "").slice(0, 2).toUpperCase() || "TT";
    doc.text(monogram, 23, 25.5, { align: "center" });
}

function addDocumentHeader(
    doc: jsPDF,
    companyInfo: CompanyInfo,
    title: string,
    englishTitle: string,
    documentNumber: string,
    status: string,
) {
    doc.setFillColor(...COLORS.blue);
    doc.rect(0, 0, 210, 7, "F");
    addLogo(doc, companyInfo);

    doc.setTextColor(...COLORS.navy);
    setThaiFont(doc, "bold");
    doc.setFontSize(16);
    doc.text(companyInfo.legalName || companyInfo.displayName, 37, 19);
    setThaiFont(doc, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.gray);
    const companyDetails = [
        companyInfo.address,
        companyInfo.taxId ? `เลขประจำตัวผู้เสียภาษี ${companyInfo.taxId}  ${companyInfo.branch || ""}` : "",
        [companyInfo.phone && `โทร. ${companyInfo.phone}`, companyInfo.email].filter(Boolean).join("  "),
    ].filter(Boolean);
    let companyY = 24;
    for (const line of companyDetails) {
        const wrapped = doc.splitTextToSize(line, 94).slice(0, 2);
        doc.text(wrapped, 37, companyY);
        companyY += wrapped.length * 4;
    }

    setThaiFont(doc, "bold");
    doc.setTextColor(...COLORS.navy);
    doc.setFontSize(18);
    doc.text(title, 196, 19, { align: "right" });
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.gray);
    doc.text(englishTitle, 196, 24, { align: "right" });
    doc.setFontSize(10);
    doc.text(`เลขที่ ${documentNumber || "-"}`, 196, 31, { align: "right" });

    const isPaid = status === "PAID";
    const isFailed = status === "FAILED";
    const fill = isPaid ? COLORS.paleGreen : isFailed ? COLORS.paleRed : COLORS.paleAmber;
    const textColor = isPaid ? COLORS.green : isFailed ? COLORS.red : COLORS.amber;
    doc.setFillColor(...fill);
    doc.roundedRect(161, 34, 35, 8, 2, 2, "F");
    doc.setTextColor(...textColor);
    setThaiFont(doc, "bold");
    doc.setFontSize(10);
    doc.text(paymentStatusLabel(status), 178.5, 39.4, { align: "center" });

    doc.setDrawColor(...COLORS.border);
    doc.line(14, 47, 196, 47);
}

function addSectionTitle(doc: jsPDF, title: string, y: number) {
    doc.setFillColor(...COLORS.blue);
    doc.roundedRect(14, y - 3.4, 3, 4.5, 1, 1, "F");
    doc.setTextColor(...COLORS.navy);
    setThaiFont(doc, "bold");
    doc.setFontSize(11.5);
    doc.text(title, 20, y);
}

function addInfoLine(doc: jsPDF, label: string, value: string, x: number, y: number, width = 78) {
    setThaiFont(doc, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.gray);
    doc.text(label, x, y);
    setThaiFont(doc, "bold");
    doc.setTextColor(...COLORS.navy);
    const wrapped = doc.splitTextToSize(value || "-", width);
    doc.text(wrapped[0] || "-", x + 22, y);
}

function addFooter(doc: jsPDF, documentNumber: string) {
    doc.setDrawColor(...COLORS.border);
    doc.line(14, 282, 196, 282);
    setThaiFont(doc, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.gray);
    doc.text("เอกสารนี้มีข้อมูลส่วนบุคคล กรุณาเก็บรักษาอย่างเหมาะสม", 14, 287);
    doc.text(`สร้างเมื่อ ${formatGeneratedAt()}  |  ${documentNumber || "-"}  |  หน้า 1/1`, 196, 287, { align: "right" });
}

export function createPayslipPdfDocument(payslip: PayslipPdfData, companyInfo: CompanyInfo) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    setupThaiFont(doc);
    doc.setProperties({
        title: `สลิปเงินเดือน ${payslip.documentNumber || payslip.user.employeeId}`,
        subject: "Payroll payslip",
        author: companyInfo.legalName || companyInfo.displayName,
        creator: "TimeTrack Payroll",
    });

    const status = String(payslip.paymentStatus || "PENDING").toUpperCase();
    addDocumentHeader(
        doc,
        companyInfo,
        "สลิปเงินเดือน",
        "PAYSLIP",
        payslip.documentNumber || "-",
        status,
    );

    addSectionTitle(doc, "ข้อมูลพนักงานและงวดเงินเดือน", 53);
    doc.setFillColor(...COLORS.paleGray);
    doc.roundedRect(14, 57, 88, 29, 2, 2, "F");
    doc.roundedRect(106, 57, 90, 29, 2, 2, "F");
    addInfoLine(doc, "ชื่อ", payslip.user.name, 19, 64, 57);
    addInfoLine(doc, "รหัส", payslip.user.employeeId, 19, 72, 57);
    addInfoLine(doc, "หน่วยงาน", [payslip.user.station?.name, payslip.user.department?.name].filter(Boolean).join(" / ") || "-", 19, 80, 57);
    addInfoLine(doc, "งวด", payslip.period.name || `${formatPayrollDate(payslip.period.startDate)} - ${formatPayrollDate(payslip.period.endDate)}`, 111, 64, 60);
    addInfoLine(doc, "ช่วงวันที่", `${formatPayrollDate(payslip.period.startDate)} - ${formatPayrollDate(payslip.period.endDate)}`, 111, 72, 60);
    addInfoLine(doc, status === "PAID" ? "จ่ายเมื่อ" : "กำหนดจ่าย", formatPayrollDate(status === "PAID" ? payslip.paidAt : payslip.period.payDate || payslip.createdAt), 111, 80, 60);

    addSectionTitle(doc, "สรุปเวลาทำงานและอัตราค่าจ้าง", 94);
    doc.setFillColor(...COLORS.paleBlue);
    doc.roundedRect(14, 98, 182, 17, 2, 2, "F");
    const overtimeHours = numberValue(payslip.overtimeHours);
    const overtimeRate = overtimeHours > 0 ? numberValue(payslip.overtimePay) / overtimeHours : 0;
    const workItems = [
        ["วันทำงาน", formatQuantity(payslip.workDays, " วัน")],
        ["ชั่วโมงรวม", formatQuantity(payslip.totalHours, " ชม.")],
        ["ชั่วโมง OT", formatQuantity(payslip.overtimeHours, " ชม.")],
        ["ค่าแรงต่อวัน", `${formatMoney(payslip.dailyRate)} บาท`],
        ["อัตรา OT", `${formatMoney(overtimeRate)} บาท/ชม.`],
    ];
    workItems.forEach(([label, value], index) => {
        const cellWidth = 182 / workItems.length;
        const x = 14 + (cellWidth * index);
        if (index > 0) {
            doc.setDrawColor(...COLORS.border);
            doc.line(x, 101, x, 112);
        }
        setThaiFont(doc, "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.gray);
        doc.text(label, x + cellWidth / 2, 104, { align: "center" });
        setThaiFont(doc, "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(...COLORS.navy);
        doc.text(value, x + cellWidth / 2, 110.5, { align: "center" });
    });

    const adjustment = numberValue(payslip.adjustment);
    const positiveAdjustment = Math.max(0, adjustment);
    const negativeAdjustment = Math.max(0, -adjustment);
    const earnings = [
        ["ค่าแรง", formatMoney(payslip.basePay)],
        ["ค่าล่วงเวลา (OT)", formatMoney(payslip.overtimePay)],
        ["โบนัส / ปรับเพิ่ม", formatMoney(positiveAdjustment)],
        ["รายได้พิเศษที่อนุมัติ", formatMoney(payslip.specialIncome)],
    ];
    const deductions = [
        ["หักมาสาย", formatMoney(payslip.latePenalty)],
        ["หักเบิกล่วงหน้า", formatMoney(payslip.advanceDeduct)],
        ["หักอื่น ๆ", formatMoney(payslip.otherDeduct)],
        ["ประกันสังคม", formatMoney(payslip.socialSecurity)],
        ["ภาษีหัก ณ ที่จ่าย", formatMoney(payslip.taxWithheld)],
        ["ปรับลด", formatMoney(negativeAdjustment)],
    ];
    const tableStyles = {
        font: thaiFont(doc),
        fontSize: 9.5,
        cellPadding: { top: 1.4, right: 2, bottom: 1.4, left: 2 },
        lineColor: COLORS.border,
        lineWidth: 0.2,
        textColor: COLORS.navy,
    };

    autoTable(doc, {
        startY: 121,
        margin: { left: 14 },
        tableWidth: 87,
        head: [["รายได้", "จำนวน (บาท)"]],
        body: earnings,
        theme: "grid",
        styles: tableStyles,
        headStyles: { fillColor: COLORS.paleBlue, textColor: COLORS.blue, font: thaiFont(doc), fontStyle: "bold", fontSize: 10 },
        columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 32, halign: "right" } },
    });
    const earningsEndY = (doc as PayrollJsPdf).lastAutoTable?.finalY ?? 151;
    autoTable(doc, {
        startY: 121,
        margin: { left: 109 },
        tableWidth: 87,
        head: [["รายการหัก", "จำนวน (บาท)"]],
        body: deductions,
        theme: "grid",
        styles: tableStyles,
        headStyles: { fillColor: COLORS.paleRed, textColor: COLORS.red, font: thaiFont(doc), fontStyle: "bold", fontSize: 10 },
        columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 32, halign: "right" } },
    });
    const deductionsEndY = (doc as PayrollJsPdf).lastAutoTable?.finalY ?? 163;

    const totalEarnings = numberValue(payslip.basePay)
        + numberValue(payslip.overtimePay)
        + positiveAdjustment
        + numberValue(payslip.specialIncome);
    const totalDeductions = numberValue(payslip.latePenalty)
        + numberValue(payslip.advanceDeduct)
        + numberValue(payslip.otherDeduct)
        + numberValue(payslip.socialSecurity)
        + numberValue(payslip.taxWithheld)
        + negativeAdjustment;
    const netPay = numberValue(payslip.netPay);
    const totalY = Math.max(earningsEndY, deductionsEndY) + 5;
    doc.setFillColor(...COLORS.navy);
    doc.roundedRect(14, totalY, 182, 27, 2, 2, "F");
    const totals = [
        ["รวมรายได้", `${formatMoney(totalEarnings)} บาท`],
        ["รวมรายการหัก", `${formatMoney(totalDeductions)} บาท`],
        ["เงินได้สุทธิ", `${formatMoney(netPay)} บาท`],
    ];
    totals.forEach(([label, value], index) => {
        const x = 14 + ((182 / 3) * index);
        if (index > 0) {
            doc.setDrawColor(73, 91, 120);
            doc.line(x, totalY + 5, x, totalY + 22);
        }
        doc.setTextColor(195, 207, 224);
        setThaiFont(doc, "normal");
        doc.setFontSize(9);
        doc.text(label, x + (182 / 6), totalY + 9, { align: "center" });
        doc.setTextColor(...COLORS.white);
        setThaiFont(doc, "bold");
        doc.setFontSize(index === 2 ? 14 : 12);
        doc.text(value, x + (182 / 6), totalY + 19, { align: "center" });
    });

    const paymentY = totalY + 34;
    addSectionTitle(doc, "ข้อมูลการจ่ายเงิน", paymentY);
    doc.setFillColor(...(status === "PAID" ? COLORS.paleGreen : COLORS.paleAmber));
    doc.roundedRect(14, paymentY + 4, 182, 23, 2, 2, "F");
    addInfoLine(doc, "สถานะ", paymentStatusLabel(status), 19, paymentY + 11, 45);
    addInfoLine(doc, "วิธีจ่าย", paymentMethodLabel(payslip.paymentMethod), 19, paymentY + 19, 45);
    addInfoLine(doc, "บัญชี", `${payslip.user.bankName || "-"} ${maskBankAccountNumber(payslip.user.bankAccountNumber)}`, 105, paymentY + 11, 60);
    addInfoLine(doc, "เลขอ้างอิง", payslip.paymentReference || "-", 105, paymentY + 19, 60);

    const signatureY = Math.max(248, paymentY + 39);
    doc.setDrawColor(...COLORS.border);
    doc.line(24, signatureY + 15, 84, signatureY + 15);
    doc.line(126, signatureY + 15, 186, signatureY + 15);
    setThaiFont(doc, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.gray);
    doc.text(companyInfo.authorizedSigner ? `(${companyInfo.authorizedSigner})` : "(ผู้มีอำนาจอนุมัติ)", 54, signatureY + 21, { align: "center" });
    doc.text(companyInfo.authorizedTitle || "ผู้มีอำนาจอนุมัติ", 54, signatureY + 26, { align: "center" });
    doc.text(`(${payslip.user.name})`, 156, signatureY + 21, { align: "center" });
    doc.text("พนักงาน", 156, signatureY + 26, { align: "center" });

    addFooter(doc, payslip.documentNumber || "-");
    return doc;
}

export function createPaymentReceiptPdfDocument(payslip: PayslipPdfData, companyInfo: CompanyInfo) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    setupThaiFont(doc);
    doc.setProperties({
        title: `หลักฐานการจ่ายเงิน ${payslip.receiptNumber || payslip.user.employeeId}`,
        subject: "Payroll payment receipt",
        author: companyInfo.legalName || companyInfo.displayName,
        creator: "TimeTrack Payroll",
    });

    const status = String(payslip.paymentStatus || "PENDING").toUpperCase();
    addDocumentHeader(
        doc,
        companyInfo,
        "หลักฐานการจ่ายเงินเดือน",
        "PAYROLL PAYMENT RECEIPT",
        payslip.receiptNumber || "-",
        status,
    );

    addSectionTitle(doc, "ผู้จ่ายและผู้รับเงิน", 55);
    doc.setFillColor(...COLORS.paleGray);
    doc.roundedRect(14, 59, 88, 36, 2, 2, "F");
    doc.roundedRect(106, 59, 90, 36, 2, 2, "F");
    addInfoLine(doc, "ผู้จ่าย", companyInfo.legalName || companyInfo.displayName, 19, 67, 57);
    addInfoLine(doc, "เลขภาษี", companyInfo.taxId || "-", 19, 76, 57);
    addInfoLine(doc, "สาขา", companyInfo.branch || "-", 19, 85, 57);
    addInfoLine(doc, "ผู้รับเงิน", payslip.user.name, 111, 67, 58);
    addInfoLine(doc, "รหัส", payslip.user.employeeId, 111, 76, 58);
    addInfoLine(doc, "หน่วยงาน", [payslip.user.station?.name, payslip.user.department?.name].filter(Boolean).join(" / ") || "-", 111, 85, 58);

    const netPay = numberValue(payslip.netPay);
    addSectionTitle(doc, "จำนวนเงินที่จ่าย", 105);
    doc.setFillColor(...COLORS.navy);
    doc.roundedRect(14, 110, 182, 38, 3, 3, "F");
    doc.setTextColor(195, 207, 224);
    setThaiFont(doc, "normal");
    doc.setFontSize(10);
    doc.text("เงินเดือนสุทธิ", 105, 119, { align: "center" });
    doc.setTextColor(...COLORS.white);
    setThaiFont(doc, "bold");
    doc.setFontSize(24);
    doc.text(`${formatMoney(netPay)} บาท`, 105, 132, { align: "center" });
    doc.setFontSize(10.5);
    doc.text(`(${thaiBahtText(netPay)})`, 105, 141, { align: "center" });

    addSectionTitle(doc, "รายละเอียดการจ่าย", 159);
    doc.setFillColor(...COLORS.paleGreen);
    doc.roundedRect(14, 164, 182, 43, 2, 2, "F");
    addInfoLine(doc, "งวด", payslip.period.name || `${formatPayrollDate(payslip.period.startDate)} - ${formatPayrollDate(payslip.period.endDate)}`, 19, 173, 65);
    addInfoLine(doc, "วันที่จ่าย", formatPayrollDate(payslip.paidAt || payslip.period.payDate || payslip.createdAt), 19, 183, 65);
    addInfoLine(doc, "วิธีจ่าย", paymentMethodLabel(payslip.paymentMethod), 19, 193, 65);
    addInfoLine(doc, "ธนาคาร", payslip.user.bankName || "-", 107, 173, 59);
    addInfoLine(doc, "บัญชีปลายทาง", maskBankAccountNumber(payslip.user.bankAccountNumber), 107, 183, 59);
    addInfoLine(doc, "เลขอ้างอิง", payslip.paymentReference || "-", 107, 193, 59);
    if (payslip.paymentNote) {
        setThaiFont(doc, "normal");
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.gray);
        doc.text(`หมายเหตุ: ${payslip.paymentNote}`, 19, 202);
    }

    setThaiFont(doc, "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.navy);
    const statement = "เอกสารนี้ยืนยันว่าบริษัทได้บันทึกการจ่ายเงินเดือนตามรายละเอียดข้างต้น ผู้รับเงินสามารถลงนามเพื่อรับรองการได้รับเงิน";
    doc.text(doc.splitTextToSize(statement, 174), 18, 219);

    const signatureY = 235;
    doc.setDrawColor(...COLORS.border);
    doc.line(24, signatureY + 18, 84, signatureY + 18);
    doc.line(126, signatureY + 18, 186, signatureY + 18);
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.gray);
    doc.text(companyInfo.authorizedSigner ? `(${companyInfo.authorizedSigner})` : "(ผู้มีอำนาจอนุมัติ)", 54, signatureY + 24, { align: "center" });
    doc.text(companyInfo.authorizedTitle || "ผู้มีอำนาจอนุมัติ", 54, signatureY + 29, { align: "center" });
    doc.text(`(${payslip.user.name})`, 156, signatureY + 24, { align: "center" });
    doc.text("ผู้รับเงิน", 156, signatureY + 29, { align: "center" });

    addFooter(doc, payslip.receiptNumber || "-");
    return doc;
}
