export interface TimeTrackSettings {
    lateThresholdMinutes: number;
    earlyCheckInMinutes: number;
    autoCheckOutHours: number;
    geoFenceEnabled: boolean;
    geoFenceRadius: number;
    enablePushNotifications: boolean;
    enableEmailNotifications: boolean;
    notifyManagerOnLate: boolean;
    requirePhotoOnCheckIn: boolean;
    require2FA: boolean;
}

export const DEFAULT_TIME_TRACK_SETTINGS: TimeTrackSettings = {
    lateThresholdMinutes: 15,
    earlyCheckInMinutes: 30,
    autoCheckOutHours: 12,
    geoFenceEnabled: true,
    geoFenceRadius: 100,
    enablePushNotifications: true,
    enableEmailNotifications: false,
    notifyManagerOnLate: true,
    requirePhotoOnCheckIn: false,
    require2FA: false,
};

export const TIME_TRACK_SETTING_KEYS = {
    lateThresholdMinutes: "attendance_late_threshold_minutes",
    earlyCheckInMinutes: "attendance_early_check_in_minutes",
    autoCheckOutHours: "attendance_auto_check_out_hours",
    geoFenceEnabled: "geo_fence_enabled",
    geoFenceRadius: "geo_fence_radius",
    enablePushNotifications: "notifications_enable_push",
    enableEmailNotifications: "notifications_enable_email",
    notifyManagerOnLate: "notifications_notify_manager_on_late",
    requirePhotoOnCheckIn: "security_require_photo_on_check_in",
    require2FA: "security_require_2fa",
} as const satisfies Record<keyof TimeTrackSettings, string>;

function normalizeInteger(value: number, fallback: number) {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.max(0, Math.round(value));
}

export function normalizeTimeTrackSettings(
    partialSettings: Partial<TimeTrackSettings>,
): TimeTrackSettings {
    return {
        lateThresholdMinutes: normalizeInteger(
            partialSettings.lateThresholdMinutes ?? DEFAULT_TIME_TRACK_SETTINGS.lateThresholdMinutes,
            DEFAULT_TIME_TRACK_SETTINGS.lateThresholdMinutes,
        ),
        earlyCheckInMinutes: normalizeInteger(
            partialSettings.earlyCheckInMinutes ?? DEFAULT_TIME_TRACK_SETTINGS.earlyCheckInMinutes,
            DEFAULT_TIME_TRACK_SETTINGS.earlyCheckInMinutes,
        ),
        autoCheckOutHours: normalizeInteger(
            partialSettings.autoCheckOutHours ?? DEFAULT_TIME_TRACK_SETTINGS.autoCheckOutHours,
            DEFAULT_TIME_TRACK_SETTINGS.autoCheckOutHours,
        ),
        geoFenceEnabled: partialSettings.geoFenceEnabled ?? DEFAULT_TIME_TRACK_SETTINGS.geoFenceEnabled,
        geoFenceRadius: normalizeInteger(
            partialSettings.geoFenceRadius ?? DEFAULT_TIME_TRACK_SETTINGS.geoFenceRadius,
            DEFAULT_TIME_TRACK_SETTINGS.geoFenceRadius,
        ),
        enablePushNotifications: partialSettings.enablePushNotifications ?? DEFAULT_TIME_TRACK_SETTINGS.enablePushNotifications,
        enableEmailNotifications: partialSettings.enableEmailNotifications ?? DEFAULT_TIME_TRACK_SETTINGS.enableEmailNotifications,
        notifyManagerOnLate: partialSettings.notifyManagerOnLate ?? DEFAULT_TIME_TRACK_SETTINGS.notifyManagerOnLate,
        requirePhotoOnCheckIn: partialSettings.requirePhotoOnCheckIn ?? DEFAULT_TIME_TRACK_SETTINGS.requirePhotoOnCheckIn,
        require2FA: partialSettings.require2FA ?? DEFAULT_TIME_TRACK_SETTINGS.require2FA,
    };
}
