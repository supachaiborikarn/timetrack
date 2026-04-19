import { prisma } from "@/lib/prisma";
import {
    DEFAULT_TIME_TRACK_SETTINGS,
    normalizeTimeTrackSettings,
    TIME_TRACK_SETTING_KEYS,
    type TimeTrackSettings,
} from "@/lib/system-settings";

const BOOLEAN_SETTING_KEYS = new Set<keyof TimeTrackSettings>([
    "geoFenceEnabled",
    "enablePushNotifications",
    "enableEmailNotifications",
    "notifyManagerOnLate",
    "requirePhotoOnCheckIn",
    "require2FA",
]);

function parseStoredSetting(
    key: keyof TimeTrackSettings,
    rawValue: string,
): boolean | number {
    if (BOOLEAN_SETTING_KEYS.has(key)) {
        return rawValue === "true";
    }

    return Number(rawValue);
}

export async function getTimeTrackSettings(): Promise<TimeTrackSettings> {
    const records = await prisma.systemConfig.findMany({
        where: {
            key: {
                in: Object.values(TIME_TRACK_SETTING_KEYS),
            },
        },
    });

    const settingsByKey = new Map(records.map((record) => [record.key, record.value]));
    const partialSettings: Partial<TimeTrackSettings> = {};

    for (const [settingName, storageKey] of Object.entries(TIME_TRACK_SETTING_KEYS) as Array<[keyof TimeTrackSettings, string]>) {
        const storedValue = settingsByKey.get(storageKey);
        if (storedValue === undefined) {
            continue;
        }

        partialSettings[settingName] = parseStoredSetting(settingName, storedValue) as never;
    }

    return normalizeTimeTrackSettings({
        ...DEFAULT_TIME_TRACK_SETTINGS,
        ...partialSettings,
    });
}

export async function saveTimeTrackSettings(
    partialSettings: Partial<TimeTrackSettings>,
): Promise<TimeTrackSettings> {
    const normalizedSettings = normalizeTimeTrackSettings({
        ...DEFAULT_TIME_TRACK_SETTINGS,
        ...partialSettings,
    });

    await prisma.$transaction(
        (Object.entries(TIME_TRACK_SETTING_KEYS) as Array<[keyof TimeTrackSettings, string]>).map(([settingName, storageKey]) =>
            prisma.systemConfig.upsert({
                where: { key: storageKey },
                update: { value: String(normalizedSettings[settingName]) },
                create: {
                    key: storageKey,
                    value: String(normalizedSettings[settingName]),
                },
            }),
        ),
    );

    return normalizedSettings;
}
