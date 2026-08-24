import { startOfDayBangkok } from "@/lib/date-utils";

const DAY_MS = 24 * 60 * 60 * 1000;

/** ช่วงวันตามปฏิทินกรุงเทพฯ ใช้แบบปิดต้นวันและเปิดปลายวัน */
export function bangkokCalendarDayRange(at: Date): { gte: Date; lt: Date } {
    const gte = startOfDayBangkok(at);
    return { gte, lt: new Date(gte.getTime() + DAY_MS) };
}
