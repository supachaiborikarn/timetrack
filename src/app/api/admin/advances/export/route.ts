import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// GET - Export advances to Excel
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const month = searchParams.get("month");
        const year = searchParams.get("year");
        const status = searchParams.get("status");
        const stationId = searchParams.get("stationId");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};

        if (month && year) {
            where.month = parseInt(month);
            where.year = parseInt(year);
        }

        if (status) {
            where.status = status;
        }

        if (stationId) {
            where.user = {
                registeredStationId: stationId,
            };
        }

        const advances = await prisma.advance.findMany({
            where,
            include: {
                user: {
                    select: {
                        name: true,
                        employeeId: true,
                        registeredStation: {
                            select: { name: true },
                        },
                        station: {
                            select: { name: true },
                        },
                    },
                },
            },
        });

        // Sort: registered station name → employee name → amount
        advances.sort((a, b) => {
            const stationA = a.user.registeredStation?.name || "ไม่ระบุ";
            const stationB = b.user.registeredStation?.name || "ไม่ระบุ";
            if (stationA !== stationB) return stationA.localeCompare(stationB, "th");

            const nameA = a.user.name || "";
            const nameB = b.user.name || "";
            if (nameA !== nameB) return nameA.localeCompare(nameB, "th");

            return Number(b.amount) - Number(a.amount);
        });

        const statusMap: Record<string, string> = {
            PENDING: "รออนุมัติ",
            APPROVED: "อนุมัติแล้ว",
            PAID: "จ่ายแล้ว",
            REJECTED: "ปฏิเสธ",
        };

        // Build Excel data
        const data = advances.map((adv, index) => ({
            "ลำดับ": index + 1,
            "ห้างประกันสังคม": adv.user.registeredStation?.name || "ไม่ระบุ",
            "สถานีทำงาน": adv.user.station?.name || "ไม่ระบุ",
            "รหัสพนักงาน": adv.user.employeeId,
            "ชื่อพนักงาน": adv.user.name,
            "ยอดเบิก (บาท)": Number(adv.amount),
            "สถานะ": statusMap[adv.status] || adv.status,
            "เหตุผล": adv.reason || "-",
            "หมายเหตุ": (adv as any).note || "-",
            "วันที่ขอเบิก": new Date(adv.createdAt).toLocaleDateString("th-TH"),
        }));

        // Add summary row
        const totalAmount = advances.reduce((sum, a) => sum + Number(a.amount), 0);
        data.push({
            "ลำดับ": 0,
            "ห้างประกันสังคม": "",
            "สถานีทำงาน": "",
            "รหัสพนักงาน": "",
            "ชื่อพนักงาน": "รวมทั้งหมด",
            "ยอดเบิก (บาท)": totalAmount,
            "สถานะ": `${advances.length} รายการ`,
            "เหตุผล": "",
            "หมายเหตุ": "",
            "วันที่ขอเบิก": "",
        });

        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        ws["!cols"] = [
            { wch: 6 },   // ลำดับ
            { wch: 20 },  // ห้างประกันสังคม
            { wch: 20 },  // สถานีทำงาน
            { wch: 12 },  // รหัสพนักงาน
            { wch: 25 },  // ชื่อพนักงาน
            { wch: 15 },  // ยอดเบิก
            { wch: 12 },  // สถานะ
            { wch: 25 },  // เหตุผล
            { wch: 25 },  // หมายเหตุ
            { wch: 15 },  // วันที่ขอเบิก
        ];

        const wb = XLSX.utils.book_new();
        const periodLabel = month && year ? `${month}_${year}` : "all";
        XLSX.utils.book_append_sheet(wb, ws, `advance_${periodLabel}`);

        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        const filename = `advance_${periodLabel}.xlsx`;

        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error exporting advances:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
