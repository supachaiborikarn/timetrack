/**
 * Lightweight login rate helpers.
 *
 * Unknown identifiers are held in memory to slow username guessing.
 * Existing users are locked with database fields so the lock follows the account.
 */

type Attempt = {
    count: number;
    firstAt: number;
    lockedUntil?: number;
};

const store = new Map<string, Attempt>();

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;

const MAX_ENTRIES = 10_000; // safety cap to bound memory

function now(): number {
    return Date.now();
}

/** Normalize an identifier so "0812345678" and " 0812345678 " collapse together. */
export function loginRateKey(identifier: string): string {
    return identifier.trim().toLowerCase();
}

/** Occasionally drop stale entries so the map does not grow unbounded. */
function prune(): void {
    if (store.size < MAX_ENTRIES) return;
    const t = now();
    for (const [key, a] of store) {
        const expired = (a.lockedUntil ?? 0) < t && t - a.firstAt > LOGIN_WINDOW_MS;
        if (expired) store.delete(key);
    }
}

/**
 * Returns whether a login attempt is currently allowed for this key.
 * Call BEFORE verifying credentials.
 */
export function checkLoginAllowed(
    key: string,
): { allowed: boolean; retryAfterSec: number } {
    const a = store.get(key);
    if (!a) return { allowed: true, retryAfterSec: 0 };

    const t = now();
    if (a.lockedUntil && a.lockedUntil > t) {
        return { allowed: false, retryAfterSec: Math.ceil((a.lockedUntil - t) / 1000) };
    }
    return { allowed: true, retryAfterSec: 0 };
}

/**
 * Record a failed attempt. Locks the key once MAX_ATTEMPTS is reached
 * within the window. Call AFTER credentials fail.
 */
export function recordLoginFailure(key: string): void {
    prune();
    const t = now();
    const a = store.get(key);

    // No record, or the previous window/lock has fully elapsed → start fresh.
    if (!a || (t - a.firstAt > LOGIN_WINDOW_MS && (!a.lockedUntil || a.lockedUntil < t))) {
        store.set(key, { count: 1, firstAt: t });
        return;
    }

    a.count += 1;
    if (a.count >= LOGIN_MAX_ATTEMPTS) {
        a.lockedUntil = t + LOGIN_LOCK_MS;
        a.count = 0; // reset counter; lock window now governs access
        a.firstAt = t;
    }
    store.set(key, a);
}

/** Clear all failure state for a key. Call AFTER a successful login. */
export function recordLoginSuccess(key: string): void {
    store.delete(key);
}

export function checkUserLoginAllowed(
    lockedUntil: Date | null | undefined,
    at = new Date(),
): { allowed: boolean; retryAfterSec: number } {
    if (!lockedUntil || lockedUntil <= at) {
        return { allowed: true, retryAfterSec: 0 };
    }

    return {
        allowed: false,
        retryAfterSec: Math.ceil((lockedUntil.getTime() - at.getTime()) / 1000),
    };
}

export function nextUserLoginFailureState(
    failedLoginAttempts: number,
    failedLoginFirstAt: Date | null | undefined,
    lockedUntil: Date | null | undefined,
    at = new Date(),
): { failedLoginAttempts: number; failedLoginFirstAt: Date | null; loginLockedUntil: Date | null } {
    const lockExpired = !!lockedUntil && lockedUntil <= at;
    const missingWindow = !failedLoginFirstAt;
    const windowExpired = !!failedLoginFirstAt && at.getTime() - failedLoginFirstAt.getTime() > LOGIN_WINDOW_MS;
    const shouldStartFresh = lockExpired || missingWindow || windowExpired;
    const currentFailures = shouldStartFresh ? 0 : Math.max(0, failedLoginAttempts);
    const nextFailures = currentFailures + 1;

    if (nextFailures >= LOGIN_MAX_ATTEMPTS) {
        return {
            failedLoginAttempts: 0,
            failedLoginFirstAt: null,
            loginLockedUntil: new Date(at.getTime() + LOGIN_LOCK_MS),
        };
    }

    return {
        failedLoginAttempts: nextFailures,
        failedLoginFirstAt: shouldStartFresh ? at : failedLoginFirstAt ?? at,
        loginLockedUntil: null,
    };
}
