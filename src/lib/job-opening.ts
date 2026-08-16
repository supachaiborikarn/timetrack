/** Shared helpers for job openings (used by both the admin API and the public pages). */

/**
 * Builds a URL slug, keeping Thai text readable.
 *
 * `\p{M}` is essential and easy to miss: Thai vowel and tone marks (ั ้ ิ ุ ์ …) are combining
 * marks, not letters, so a `\p{L}\p{N}`-only filter silently strips them and turns
 * "พนักงานหน้าลานปั๊ม" into the unreadable "พนกงานหนาลานปม".
 */
export function slugifyJobTitle(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
        .replace(/[^\p{L}\p{N}\p{M}-]/gu, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
}

/**
 * Reads a slug out of a route param. Next.js hands dynamic params through still
 * percent-encoded, so a Thai slug arrives as "%E0%B8%9E…" and would never match the stored
 * value without decoding first.
 */
export function decodeSlugParam(raw: string): string {
    try {
        return decodeURIComponent(raw);
    } catch {
        // Malformed escape sequence — fall back to the raw value rather than throwing.
        return raw;
    }
}

/** An opening is visible to applicants only while it is active and not past its closing date. */
export function isOpeningOpen(opening: { isActive: boolean; closesAt: Date | string | null }): boolean {
    if (!opening.isActive) return false;
    if (!opening.closesAt) return true;
    return new Date(opening.closesAt).getTime() >= new Date().setHours(0, 0, 0, 0);
}

export function formatSalaryRange(
    salaryMin: number | null,
    salaryMax: number | null,
    salaryNote: string | null,
): string {
    if (salaryMin != null && salaryMax != null) {
        return `${salaryMin.toLocaleString("th-TH")} - ${salaryMax.toLocaleString("th-TH")} บาท`;
    }
    if (salaryMin != null) return `เริ่มต้น ${salaryMin.toLocaleString("th-TH")} บาท`;
    if (salaryMax != null) return `สูงสุด ${salaryMax.toLocaleString("th-TH")} บาท`;
    return salaryNote || "ตามตกลง";
}

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
    FULL_TIME: "เต็มเวลา",
    PART_TIME: "พาร์ทไทม์",
    DAILY: "รายวัน",
};
