import { Role, AttendanceStatus, LeaveType, LeaveStatus, StationType } from "@prisma/client";

// ==================== API Response Types ====================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// ==================== User Types ====================

export interface UserBasic {
    id: string;
    employeeId: string;
    name: string;
    role: Role;
    stationId?: string | null;
}

export interface UserWithStation extends UserBasic {
    station?: {
        id: string;
        name: string;
        code: string;
    } | null;
    department?: {
        id: string;
        name: string;
        code: string;
    } | null;
}

// ==================== Attendance Types ====================

export interface CheckInRequest {
    latitude: number;
    longitude: number;
    deviceId: string;
    method: "GPS" | "QR";
    qrCode?: string;
}

export interface CheckOutRequest {
    latitude: number;
    longitude: number;
    deviceId: string;
    method: "GPS" | "QR";
}

export interface AttendanceRecord {
    id: string;
    userId: string;
    date: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    status: AttendanceStatus;
    actualHours: number | null;
    overtimeHours: number | null;
    lateMinutes: number | null;
    latePenaltyAmount: number;
    user?: {
        id: string;
        name: string;
        employeeId: string;
    };
}

// ==================== Shift Types ====================

export interface ShiftInfo {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
}

export interface ShiftAssignmentWithShift {
    id: string;
    date: string;
    shift: ShiftInfo;
}

// ==================== Station Types ====================

export interface StationInfo {
    id: string;
    name: string;
    code: string;
    type: StationType;
    latitude: number;
    longitude: number;
    radius: number;
    qrCode?: string | null;
}

// ==================== Leave Types ====================

export interface LeaveRequest {
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason?: string;
}

export interface LeaveRecord {
    id: string;
    userId: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason: string | null;
    status: LeaveStatus;
    user?: {
        id: string;
        name: string;
    };
}

// ==================== Payroll Types ====================

export interface PayrollSummary {
    userId: string;
    userName: string;
    employeeId: string;
    workDays: number;
    totalHours: number;
    overtimeHours: number;
    basePay: number;
    overtimePay: number;
    latePenalty: number;
    advanceDeduct: number;
    netPay: number;
}

export interface PayrollPeriodInfo {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    payDate: string;
    status: string;
}

// ==================== Dashboard Types ====================

export interface DashboardStats {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
    pendingLeaves: number;
}

export interface StationDashboard {
    station: StationInfo;
    stats: DashboardStats;
    recentAttendance: AttendanceRecord[];
}

// ==================== Report Types ====================

export interface AttendanceReport {
    period: {
        startDate: string;
        endDate: string;
    };
    records: AttendanceRecord[];
    summary: {
        totalDays: number;
        presentDays: number;
        absentDays: number;
        leaveDays: number;
        totalHours: number;
        totalOT: number;
        totalLatePenalty: number;
    };
}
