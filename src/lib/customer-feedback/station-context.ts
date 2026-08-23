import { prisma } from "@/lib/prisma";
import { startOfDayBangkok } from "@/lib/date-utils";

/**
 * Helper กลางของสถานีในระบบเสียงลูกค้า — ทุก API ต้องใช้ชุดนี้ชุดเดียวกัน
 *
 * isStationFeedbackEnabled — ใช้กับหน้า/API ของ Station feedback โดยต้องมี
 *   publicEmergencyPhone และ primary STATION QR ที่ isActive
 * isEmployeeFeedbackStationEligible — ใช้กับการเลือกสถานีใน Employee feedback
 *   และ Incident ซึ่งรับแค่ Station.isActive เพื่อให้ QR พนักงานทำงานได้แม้สถานี
 *   ยังไม่มี QR ประเมินสถานี
 */

export interface StationEligibility {
    id: string;
    name: string;
    publicEmergencyPhone: string | null;
}

export async function isStationFeedbackEnabled(stationId: string): Promise<boolean> {
    const station = await prisma.station.findUnique({
        where: { id: stationId },
        select: { isActive: true, publicEmergencyPhone: true },
    });
    if (!station || !station.isActive || !station.publicEmergencyPhone) return false;
    const qr = await prisma.customerFeedbackQr.findFirst({
        where: { stationId, targetType: "STATION", isPrimary: true, isActive: true },
        select: { id: true },
    });
    return qr !== null;
}

export async function isEmployeeFeedbackStationEligible(stationId: string): Promise<boolean> {
    const station = await prisma.station.findUnique({
        where: { id: stationId },
        select: { isActive: true },
    });
    return station?.isActive === true;
}

export async function searchEligibleStations(query: string, limit = 20): Promise<StationEligibility[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const stations = await prisma.station.findMany({
        where: { isActive: true, OR: [{ name: { contains: q } }, { code: { contains: q } }] },
        select: { id: true, name: true, publicEmergencyPhone: true },
        take: limit,
        orderBy: { name: "asc" },
    });
    return stations;
}

/**
 * หาสถานีปัจจุบันของพนักงานตอนเปิด QR (E0)
 * ลำดับ: StationTransfer ล่าสุดของ attendance วันนี้ -> checkInStation ของ
 * Attendance ล่าสุดวันนี้ -> User.stationId
 * ห้ามนับ transfer เก่าจาก attendance ก่อนหน้า
 */
export async function resolveEmployeeCurrentStation(
    userId: string,
    now: Date = new Date()
): Promise<{ stationId: string | null; source: "CURRENT_TRANSFER" | "CURRENT_ATTENDANCE" | "USER_STATION" | "UNKNOWN" }> {
    const dayStart = startOfDayBangkok(now);

    const latestAttendance = await prisma.attendance.findFirst({
        where: { userId, date: { gte: dayStart } },
        orderBy: { date: "desc" },
        select: { id: true, checkInStationId: true },
    });

    if (latestAttendance?.id) {
        const transfer = await prisma.stationTransfer.findFirst({
            where: { userId, attendanceId: latestAttendance.id, transferTime: { lte: now } },
            orderBy: { transferTime: "desc" },
            select: { toStationId: true },
        });
        if (transfer) {
            const active = await isEmployeeFeedbackStationEligible(transfer.toStationId);
            if (active) return { stationId: transfer.toStationId, source: "CURRENT_TRANSFER" };
        }
        if (latestAttendance.checkInStationId) {
            const active = await isEmployeeFeedbackStationEligible(latestAttendance.checkInStationId);
            if (active) return { stationId: latestAttendance.checkInStationId, source: "CURRENT_ATTENDANCE" };
        }
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stationId: true },
    });
    if (user?.stationId) {
        const active = await isEmployeeFeedbackStationEligible(user.stationId);
        if (active) return { stationId: user.stationId, source: "USER_STATION" };
    }

    return { stationId: null, source: "UNKNOWN" };
}
