import type { HousingStatus } from "@prisma/client";

/**
 * Worker-housing rules. Pure — no prisma, no server imports — so the admin page
 * and the API agree on who is owed an allowance instead of each deciding on its own.
 */

export const HOUSING_STATUS_LABELS: Record<HousingStatus, string> = {
    UNKNOWN: "ยังไม่ระบุ",
    COMPANY_DORM: "อยู่บ้านพักบริษัท",
    OWN_HOUSING: "อยู่ที่พักของตัวเอง",
};

export const HOUSING_STATUS_ORDER: HousingStatus[] = ["UNKNOWN", "COMPANY_DORM", "OWN_HOUSING"];

/** SystemConfig key holding the company-wide monthly allowance. */
export const HOUSING_ALLOWANCE_SETTING_KEY = "housing_allowance_monthly";
export const DEFAULT_HOUSING_ALLOWANCE = 0;

/** SpecialIncome.type used for the generated monthly allowance. */
export const HOUSING_ALLOWANCE_INCOME_TYPE = "HOUSING_ALLOWANCE";

export function isHousingStatus(value: unknown): value is HousingStatus {
    return typeof value === "string" && (HOUSING_STATUS_ORDER as string[]).includes(value);
}

/**
 * Only people living in their own place are owed the allowance. `UNKNOWN` is
 * deliberately excluded: not having asked someone yet is not evidence that they
 * pay their own rent, and paying out on a blank field would be a silent overpay
 * across everyone who has not been surveyed.
 */
export function isEligibleForHousingAllowance(status: HousingStatus): boolean {
    return status === "OWN_HOUSING";
}

/** Per-employee rate when one is set, otherwise the company default. */
export function effectiveHousingAllowance(
    employeeAllowance: number | null | undefined,
    companyDefault: number
): number {
    if (employeeAllowance == null) return companyDefault;
    if (!Number.isFinite(employeeAllowance) || employeeAllowance < 0) return companyDefault;
    return employeeAllowance;
}

export type HousingAssignment = {
    housingStatus: HousingStatus;
    dormitoryId: string | null;
    /** Station the employee works at. */
    stationId: string | null;
    /** Station the dormitory serves, null when the dorm isn't tied to one. */
    dormitoryStationId: string | null;
};

export type HousingIssue = "MISSING_DORMITORY" | "DORMITORY_WITHOUT_STATUS" | "STATION_MISMATCH";

/**
 * Problems worth showing in the overview. Returned as a list rather than a single
 * verdict because one record can be wrong in more than one way.
 */
export function findHousingIssues(assignment: HousingAssignment): HousingIssue[] {
    const issues: HousingIssue[] = [];

    if (assignment.housingStatus === "COMPANY_DORM" && !assignment.dormitoryId) {
        issues.push("MISSING_DORMITORY");
    }

    // A dorm left on a record whose status says otherwise — usually someone moved
    // out and only half the record was updated.
    if (assignment.housingStatus !== "COMPANY_DORM" && assignment.dormitoryId) {
        issues.push("DORMITORY_WITHOUT_STATUS");
    }

    if (
        assignment.housingStatus === "COMPANY_DORM" &&
        assignment.dormitoryId &&
        assignment.dormitoryStationId &&
        assignment.stationId &&
        assignment.dormitoryStationId !== assignment.stationId
    ) {
        issues.push("STATION_MISMATCH");
    }

    return issues;
}

export const HOUSING_ISSUE_LABELS: Record<HousingIssue, string> = {
    MISSING_DORMITORY: "ระบุว่าอยู่บ้านพักแต่ไม่ได้เลือกว่าที่ไหน",
    DORMITORY_WITHOUT_STATUS: "ผูกกับบ้านพักอยู่ทั้งที่สถานะไม่ใช่ผู้พักอาศัย",
    STATION_MISMATCH: "อยู่บ้านพักคนละสาขากับที่ทำงาน",
};

/** Number of days in a calendar month (`month` is 1-indexed). */
export function daysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The date a monthly allowance is recorded on, as a plain YYYY-MM-DD string that
 * callers turn into a Bangkok timestamp the same way the rest of the special-income
 * API does. The last day of the month is the one date that lands inside the right
 * payroll run whether the period is a calendar month or the 26th-25th cycle the
 * payroll page also offers.
 */
export function defaultAllowanceDate(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth(year, month)).padStart(2, "0")}`;
}

/**
 * Bangkok-midnight bounds of a calendar month, used to spot an allowance that was
 * already issued. Matches how special-income dates are stored (`T00:00:00+07:00`),
 * so a record written on the 1st or the last day of the month is inside the range.
 */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
    const last = String(daysInMonth(year, month)).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    return {
        start: new Date(`${year}-${mm}-01T00:00:00+07:00`),
        end: new Date(`${year}-${mm}-${last}T23:59:59+07:00`),
    };
}

export function formatMonthLabel(year: number, month: number): string {
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    return `${months[month - 1]} ${year + 543}`;
}
