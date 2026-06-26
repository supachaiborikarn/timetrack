import { describe, expect, it } from "vitest";
import {
    checkLoginAllowed,
    checkUserLoginAllowed,
    LOGIN_LOCK_MS,
    recordLoginFailure,
    recordLoginSuccess,
    nextUserLoginFailureState,
} from "../rate-limit";

describe("login rate limit", () => {
    it("locks unknown identifiers after repeated failures", () => {
        const key = `pin:missing-user-${Date.now()}`;

        for (let i = 0; i < 5; i += 1) {
            recordLoginFailure(key);
        }

        expect(checkLoginAllowed(key).allowed).toBe(false);

        recordLoginSuccess(key);
        expect(checkLoginAllowed(key).allowed).toBe(true);
    });

    it("locks existing users on the fifth failed attempt", () => {
        const at = new Date("2026-06-14T00:00:00.000Z");
        const firstAt = new Date("2026-06-13T23:50:00.000Z");
        const state = nextUserLoginFailureState(4, firstAt, null, at);

        expect(state.failedLoginAttempts).toBe(0);
        expect(state.failedLoginFirstAt).toBeNull();
        expect(state.loginLockedUntil?.getTime()).toBe(at.getTime() + LOGIN_LOCK_MS);
        expect(checkUserLoginAllowed(state.loginLockedUntil, at).allowed).toBe(false);
    });

    it("starts a fresh failure window after the old window expires", () => {
        const at = new Date("2026-06-14T00:30:00.000Z");
        const firstAt = new Date("2026-06-14T00:00:00.000Z");
        const state = nextUserLoginFailureState(4, firstAt, null, at);

        expect(state.failedLoginAttempts).toBe(1);
        expect(state.failedLoginFirstAt).toEqual(at);
        expect(state.loginLockedUntil).toBeNull();
    });

    it("resets stale lock state before counting a new failure", () => {
        const at = new Date("2026-06-14T00:30:00.000Z");
        const expiredLock = new Date("2026-06-14T00:15:00.000Z");
        const state = nextUserLoginFailureState(4, null, expiredLock, at);

        expect(state.failedLoginAttempts).toBe(1);
        expect(state.failedLoginFirstAt).toEqual(at);
        expect(state.loginLockedUntil).toBeNull();
    });
});
