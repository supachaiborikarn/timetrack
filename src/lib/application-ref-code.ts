/**
 * Reference codes for job applications (`APP-<พ.ศ. 2 หลัก>-<ลำดับ 4 หลัก>`).
 *
 * The sequence is derived from the HIGHEST code already issued this year, never from the row
 * count. A count-based sequence looks equivalent until an application is deleted: the count
 * drops, the generator re-issues a number that still belongs to a surviving row, and the unique
 * constraint on `refCode` rejects every insert from then on. Because the count does not change
 * when an insert fails, retrying produced the identical code each time — so a single deletion
 * permanently broke public submissions.
 */

/** `APP-69-` for a date in พ.ศ. 2569. */
export function refCodePrefix(date: Date = new Date()): string {
    const buddhistYear = date.getFullYear() + 543;
    return `APP-${String(buddhistYear).slice(-2)}-`;
}

/**
 * Next code after `latestRefCode` (the largest existing code with this prefix, or null when none
 * exists yet). Gaps left by deleted applications are intentionally never reused.
 */
export function nextRefCode(prefix: string, latestRefCode: string | null): string {
    const lastNumber = latestRefCode?.startsWith(prefix)
        ? Number.parseInt(latestRefCode.slice(prefix.length), 10)
        : 0;
    const next = (Number.isFinite(lastNumber) && lastNumber > 0 ? lastNumber : 0) + 1;
    // Past 9999 the code simply grows a digit. Padding is kept at 4 so existing codes are
    // unchanged, and ordering is handled numerically by the caller rather than by string sort.
    return `${prefix}${String(next).padStart(4, "0")}`;
}
