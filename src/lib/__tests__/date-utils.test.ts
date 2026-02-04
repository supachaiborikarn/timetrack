import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getBangkokNow,
    formatThaiDate,
    formatTime,
    calculateWorkHours,
    calculateLateMinutes,
    calculateLatePenalty,
    isWorkingDay,
    parseTimeOnDate,
} from '../date-utils';

describe('date-utils', () => {
    describe('getBangkokNow', () => {
        it('should return a Date object', () => {
            const now = getBangkokNow();
            expect(now).toBeInstanceOf(Date);
        });
    });

    describe('formatThaiDate', () => {
        it('should format date with default format', () => {
            const date = new Date('2024-01-15');
            const formatted = formatThaiDate(date);
            expect(typeof formatted).toBe('string');
            expect(formatted.length).toBeGreaterThan(0);
        });

        it('should accept string date', () => {
            const formatted = formatThaiDate('2024-01-15');
            expect(typeof formatted).toBe('string');
        });

        it('should accept custom format', () => {
            const date = new Date('2024-01-15');
            const formatted = formatThaiDate(date, 'yyyy-MM-dd');
            expect(formatted).toBe('2024-01-15');
        });
    });

    describe('formatTime', () => {
        it('should format time in HH:mm format', () => {
            const date = new Date('2024-01-15T08:30:00');
            const formatted = formatTime(date);
            expect(formatted).toBe('08:30');
        });

        it('should accept string date', () => {
            const formatted = formatTime('2024-01-15T14:45:00');
            expect(formatted).toBe('14:45');
        });
    });

    describe('calculateWorkHours', () => {
        it('should calculate total hours correctly', () => {
            const checkIn = new Date('2024-01-15T08:00:00');
            const checkOut = new Date('2024-01-15T17:00:00');
            const result = calculateWorkHours(checkIn, checkOut, 60);

            expect(result.totalHours).toBe(8); // 9 hours - 1 hour break
        });

        it('should calculate overtime correctly', () => {
            const checkIn = new Date('2024-01-15T08:00:00');
            const checkOut = new Date('2024-01-15T19:00:00');
            const result = calculateWorkHours(checkIn, checkOut, 60);

            expect(result.totalHours).toBe(10); // 11 hours - 1 hour break
            expect(result.overtimeHours).toBe(2); // 10 - 8 regular hours
        });

        it('should return 0 overtime for short shifts', () => {
            const checkIn = new Date('2024-01-15T08:00:00');
            const checkOut = new Date('2024-01-15T12:00:00');
            const result = calculateWorkHours(checkIn, checkOut, 60);

            expect(result.overtimeHours).toBe(0);
        });
    });

    describe('calculateLateMinutes', () => {
        it('should return 0 when on time', () => {
            const checkIn = new Date('2024-01-15T08:00:00');
            const lateMinutes = calculateLateMinutes(checkIn, '08:00');

            expect(lateMinutes).toBe(0);
        });

        it('should return 0 when early', () => {
            const checkIn = new Date('2024-01-15T07:50:00');
            const lateMinutes = calculateLateMinutes(checkIn, '08:00');

            expect(lateMinutes).toBe(0);
        });

        it('should calculate late minutes correctly', () => {
            const checkIn = new Date('2024-01-15T08:15:00');
            const lateMinutes = calculateLateMinutes(checkIn, '08:00');

            expect(lateMinutes).toBe(15);
        });
    });

    describe('calculateLatePenalty', () => {
        it('should return 0 for <= 5 minutes late', () => {
            expect(calculateLatePenalty(0)).toBe(0);
            expect(calculateLatePenalty(5)).toBe(0);
        });

        it('should calculate penalty for > 5 minutes', () => {
            expect(calculateLatePenalty(10)).toBe(50); // 1 hour = 50 baht
            expect(calculateLatePenalty(65)).toBe(100); // 2 hours = 100 baht
        });
    });

    describe('isWorkingDay', () => {
        it('should return true for weekdays', () => {
            const monday = new Date('2024-01-15'); // Monday
            const friday = new Date('2024-01-19'); // Friday

            expect(isWorkingDay(monday)).toBe(true);
            expect(isWorkingDay(friday)).toBe(true);
        });

        it('should return false for weekends', () => {
            const saturday = new Date('2024-01-20');
            const sunday = new Date('2024-01-21');

            expect(isWorkingDay(saturday)).toBe(false);
            expect(isWorkingDay(sunday)).toBe(false);
        });
    });

    describe('parseTimeOnDate', () => {
        it('should parse time string onto given date', () => {
            const date = new Date('2024-01-15T00:00:00');
            const result = parseTimeOnDate(date, '14:30');

            expect(result.getHours()).toBe(14);
            expect(result.getMinutes()).toBe(30);
            expect(result.getDate()).toBe(15);
        });
    });
});
