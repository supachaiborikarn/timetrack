// Geolocation utilities for GPS check-in validation

export interface Coordinates {
    latitude: number;
    longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
    point1: Coordinates,
    point2: Coordinates
): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Check if a point is within the station's geofence radius
 */
export function isWithinGeofence(
    userLocation: Coordinates,
    stationLocation: Coordinates,
    radiusMeters: number
): boolean {
    const distance = calculateDistance(userLocation, stationLocation);
    return distance <= radiusMeters;
}

/**
 * Get current position from browser Geolocation API
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error("กรุณาอนุญาตให้เข้าถึงตำแหน่ง"));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error("ไม่สามารถระบุตำแหน่งได้"));
                        break;
                    case error.TIMEOUT:
                        reject(new Error("หมดเวลาในการระบุตำแหน่ง"));
                        break;
                    default:
                        reject(new Error("เกิดข้อผิดพลาดในการระบุตำแหน่ง"));
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    });
}

const DEVICE_ID_STORAGE_KEY = "timetrack.deviceId.v2";

function createDeviceId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `tt_${crypto.randomUUID()}`;
    }

    const randomPart = Math.random().toString(36).slice(2);
    const timePart = Date.now().toString(36);
    return `tt_${timePart}_${randomPart}`;
}

/**
 * Generate the old browser fingerprint for one-time migration.
 */
export function getLegacyDeviceFingerprint(): string {
    if (typeof window === "undefined") return "";

    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
    ];

    // Simple hash function
    const str = components.join("|");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

/**
 * Get a stable per-browser device id.
 */
export function getDeviceFingerprint(): string {
    if (typeof window === "undefined") return "";

    try {
        const existingDeviceId = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
        if (existingDeviceId) return existingDeviceId;

        const newDeviceId = createDeviceId();
        window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, newDeviceId);
        return newDeviceId;
    } catch {
        return getLegacyDeviceFingerprint();
    }
}
