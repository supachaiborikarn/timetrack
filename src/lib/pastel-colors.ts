/**
 * Pastel Color System
 * Soft, clean colors for shift management & attendance status
 * Supports both light and dark modes
 */

export interface PastelColor {
    bg: string;
    text: string;
    border: string;
    dot?: string;
}

// Shift pastel colors — used in shift calendar cells and legends
export const shiftPastelColors: Record<string, PastelColor> = {
    A: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-200 dark:border-blue-700/50",
    },
    B: {
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-200 dark:border-emerald-700/50",
    },
    C: {
        bg: "bg-violet-100 dark:bg-violet-900/30",
        text: "text-violet-700 dark:text-violet-300",
        border: "border-violet-200 dark:border-violet-700/50",
    },
    D: {
        bg: "bg-amber-100 dark:bg-amber-900/30",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-700/50",
    },
    E: {
        bg: "bg-pink-100 dark:bg-pink-900/30",
        text: "text-pink-700 dark:text-pink-300",
        border: "border-pink-200 dark:border-pink-700/50",
    },
    F: {
        bg: "bg-cyan-100 dark:bg-cyan-900/30",
        text: "text-cyan-700 dark:text-cyan-300",
        border: "border-cyan-200 dark:border-cyan-700/50",
    },
    G: {
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
        text: "text-yellow-700 dark:text-yellow-300",
        border: "border-yellow-200 dark:border-yellow-700/50",
    },
    H: {
        bg: "bg-rose-100 dark:bg-rose-900/30",
        text: "text-rose-700 dark:text-rose-300",
        border: "border-rose-200 dark:border-rose-700/50",
    },
    CAFE: {
        bg: "bg-orange-100 dark:bg-orange-900/30",
        text: "text-orange-700 dark:text-orange-300",
        border: "border-orange-200 dark:border-orange-700/50",
    },
    OIL: {
        bg: "bg-slate-100 dark:bg-slate-800/40",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-600/50",
    },
    WASH: {
        bg: "bg-teal-100 dark:bg-teal-900/30",
        text: "text-teal-700 dark:text-teal-300",
        border: "border-teal-200 dark:border-teal-700/50",
    },
    GAS: {
        bg: "bg-indigo-100 dark:bg-indigo-900/30",
        text: "text-indigo-700 dark:text-indigo-300",
        border: "border-indigo-200 dark:border-indigo-700/50",
    },
};

// Day off special color
export const dayOffPastelColor: PastelColor = {
    bg: "bg-rose-50 dark:bg-rose-900/20",
    text: "text-rose-500 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800/50",
};

// Fallback for unknown shift codes
export const defaultPastelColor: PastelColor = {
    bg: "bg-gray-100 dark:bg-gray-800/30",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-700/50",
};

/**
 * Get pastel color for a shift code
 */
export function getShiftPastelColor(code: string): PastelColor {
    return shiftPastelColors[code] || defaultPastelColor;
}

/**
 * Get combined className for a shift cell pill
 */
export function getShiftPillClass(code: string): string {
    const color = getShiftPastelColor(code);
    return `${color.bg} ${color.text} ${color.border}`;
}

// Attendance status pastel colors
export const statusPastelColors = {
    onTime: {
        bg: "bg-emerald-50 dark:bg-emerald-900/20",
        text: "text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-400 dark:bg-emerald-500",
        border: "border-emerald-200 dark:border-emerald-700/50",
    },
    late: {
        bg: "bg-amber-50 dark:bg-amber-900/20",
        text: "text-amber-700 dark:text-amber-300",
        dot: "bg-amber-400 dark:bg-amber-500",
        border: "border-amber-200 dark:border-amber-700/50",
    },
    absent: {
        bg: "bg-rose-50 dark:bg-rose-900/20",
        text: "text-rose-700 dark:text-rose-300",
        dot: "bg-rose-400 dark:bg-rose-500",
        border: "border-rose-200 dark:border-rose-700/50",
    },
    pending: {
        bg: "bg-slate-50 dark:bg-slate-800/20",
        text: "text-slate-500 dark:text-slate-400",
        dot: "bg-slate-300 dark:bg-slate-600",
        border: "border-slate-200 dark:border-slate-700/50",
    },
};

// Dashboard stat card pastel colors
export const statCardColors = {
    employees: {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        icon: "text-blue-500 dark:text-blue-400",
        iconBg: "bg-blue-100 dark:bg-blue-900/40",
    },
    attendance: {
        bg: "bg-emerald-50 dark:bg-emerald-900/20",
        icon: "text-emerald-500 dark:text-emerald-400",
        iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    },
    approvals: {
        bg: "bg-amber-50 dark:bg-amber-900/20",
        icon: "text-amber-500 dark:text-amber-400",
        iconBg: "bg-amber-100 dark:bg-amber-900/40",
    },
    shifts: {
        bg: "bg-violet-50 dark:bg-violet-900/20",
        icon: "text-violet-500 dark:text-violet-400",
        iconBg: "bg-violet-100 dark:bg-violet-900/40",
    },
};
