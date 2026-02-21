import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatThaiDate } from "@/lib/date-utils";
import { THSarabunRegular } from "@/lib/fonts/thsarabun-regular";
import { THSarabunBold } from "@/lib/fonts/thsarabun-bold";

function setupThaiFont(doc: jsPDF) {
    doc.addFileToVFS("THSarabunNew.ttf", THSarabunRegular);
    doc.addFileToVFS("THSarabunNew-Bold.ttf", THSarabunBold);
    doc.addFont("THSarabunNew.ttf", "THSarabun", "normal");
    doc.addFont("THSarabunNew-Bold.ttf", "THSarabun", "bold");
    doc.setFont("THSarabun");
}

export const generatePayslipPDF = (payslip: any, companyInfo: any) => {
    const doc = new jsPDF();

    // Register Thai font
    setupThaiFont(doc);

    // Company name
    doc.setFont("THSarabun", "bold");
    doc.setFontSize(20);
    doc.text(companyInfo.name, 105, 20, { align: "center" });

    doc.setFontSize(16);
    doc.text("PAYSLIP / ใบแจ้งเงินเดือน", 105, 30, { align: "center" });

    // Employee Details
    doc.setFont("THSarabun", "normal");
    doc.setFontSize(12);
    doc.text(`ชื่อพนักงาน: ${payslip.user.name}`, 14, 45);
    doc.text(`รหัสพนักงาน: ${payslip.user.employeeId}`, 14, 52);
    doc.text(`แผนก: ${payslip.user.department?.name || "-"}`, 14, 59);

    doc.text(`งวด: ${formatThaiDate(new Date(payslip.period.startDate), "d MMM yyyy")} - ${formatThaiDate(new Date(payslip.period.endDate), "d MMM yyyy")}`, 120, 45);
    doc.text(`วันที่จ่าย: ${formatThaiDate(new Date(payslip.createdAt), "d MMM yyyy")}`, 120, 52);
    if (payslip.user.bankAccountNumber) {
        doc.text(`ธนาคาร: ${payslip.user.bankName || "-"} (${payslip.user.bankAccountNumber})`, 120, 59);
    }

    // Table
    const earnings = [
        ["เงินเดือน (Base Salary)", Number(payslip.basePay).toLocaleString("th-TH", { minimumFractionDigits: 2 })],
        ["ค่าล่วงเวลา (OT)", Number(payslip.overtimePay).toLocaleString("th-TH", { minimumFractionDigits: 2 })],
        ["รายได้อื่นๆ", "0.00"],
    ];

    const deductions = [
        ["หักมาสาย", Number(payslip.latePenalty).toLocaleString("th-TH", { minimumFractionDigits: 2 })],
        ["หักเบิกล่วงหน้า", Number(payslip.advanceDeduct).toLocaleString("th-TH", { minimumFractionDigits: 2 })],
        ["หักอื่นๆ", Number(payslip.otherDeduct).toLocaleString("th-TH", { minimumFractionDigits: 2 })],
        ["ภาษี", "0.00"],
        ["ประกันสังคม", "0.00"],
    ];

    // Pad arrays to match length
    const maxLength = Math.max(earnings.length, deductions.length);
    const tableData = [];

    let totalEarnings = 0;
    let totalDeductions = 0;

    // Calc totals
    totalEarnings = Number(payslip.basePay) + Number(payslip.overtimePay);
    totalDeductions = Number(payslip.latePenalty) + Number(payslip.advanceDeduct) + Number(payslip.otherDeduct);

    for (let i = 0; i < maxLength; i++) {
        const earn = earnings[i] || ["", ""];
        const deduct = deductions[i] || ["", ""];
        tableData.push([earn[0], earn[1], deduct[0], deduct[1]]);
    }

    autoTable(doc, {
        startY: 70,
        head: [["รายได้", "จำนวน (บาท)", "รายการหัก", "จำนวน (บาท)"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [51, 65, 85], font: "THSarabun", fontStyle: "bold", fontSize: 11 },
        styles: { fontSize: 11, font: "THSarabun" },
        columnStyles: {
            1: { halign: "right" },
            3: { halign: "right" },
        },
    });

    // Totals Row
    const finalY = (doc as any).lastAutoTable.finalY + 2;

    autoTable(doc, {
        startY: finalY,
        body: [
            ["รวมรายได้", totalEarnings.toLocaleString("th-TH", { minimumFractionDigits: 2 }), "รวมรายการหัก", totalDeductions.toLocaleString("th-TH", { minimumFractionDigits: 2 })]
        ],
        theme: "plain",
        styles: { fontSize: 11, fontStyle: "bold", font: "THSarabun" },
        columnStyles: {
            1: { halign: "right" },
            3: { halign: "right" },
        },
    });

    // Net Pay
    const netPay = Number(payslip.netPay);
    doc.setFillColor(241, 245, 249);
    doc.rect(14, finalY + 15, 182, 14, "F");
    doc.setFontSize(14);
    doc.setFont("THSarabun", "bold");
    doc.text("เงินได้สุทธิ (NET PAY)", 20, finalY + 24);
    doc.text(netPay.toLocaleString("th-TH", { minimumFractionDigits: 2 }) + " บาท", 190, finalY + 24, { align: "right" });

    // Footer / Signature
    doc.setFontSize(10);
    doc.setFont("THSarabun", "normal");
    doc.text("ผู้ตรวจสอบ", 140, finalY + 50);
    doc.line(140, finalY + 65, 190, finalY + 65);
    doc.text("ลายมือชื่อผู้มีอำนาจ", 140, finalY + 70);

    doc.text(`สร้างเมื่อ: ${new Date().toLocaleString("th-TH")}`, 14, 280);

    doc.save(`payslip_${payslip.user.employeeId}_${payslip.period.name}.pdf`);
};
