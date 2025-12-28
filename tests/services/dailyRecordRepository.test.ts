/**
 * DailyRecordRepository Tests
 * Tests for the repository layer that abstracts storage access.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getForDate,
    getPreviousDay,
    setFirestoreEnabled,
    isFirestoreEnabled,
    setDemoModeActive,
    isDemoModeActive
} from '../../services/repositories/DailyRecordRepository';
import { DailyRecord } from '../../types';

// Mock localStorage 
const mockStorage: Record<string, string> = {};
const localStorageMock = {
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
    removeItem: vi.fn((key: string) => delete mockStorage[key]),
    clear: vi.fn(() => { for (const key in mockStorage) delete mockStorage[key]; })
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
});

// Helper to create mock records
const createMockRecord = (date: string): DailyRecord => ({
    date,
    beds: {},
    discharges: [],
    transfers: [],
    cma: [],
    lastUpdated: new Date().toISOString(),
    nursesDayShift: ['', ''],
    nursesNightShift: ['', ''],
    tensDayShift: ['', '', ''],
    tensNightShift: ['', '', ''],
    activeExtraBeds: []
});

describe('DailyRecordRepository', () => {
    beforeEach(() => {
        // Reset mocks and storage
        vi.clearAllMocks();
        localStorageMock.clear();
        setFirestoreEnabled(true);
        setDemoModeActive(false);
    });

    describe('Configuration', () => {
        it('setFirestoreEnabled toggles Firestore state', () => {
            setFirestoreEnabled(false);
            expect(isFirestoreEnabled()).toBe(false);

            setFirestoreEnabled(true);
            expect(isFirestoreEnabled()).toBe(true);
        });

        it('setDemoModeActive toggles demo mode', () => {
            setDemoModeActive(true);
            expect(isDemoModeActive()).toBe(true);

            setDemoModeActive(false);
            expect(isDemoModeActive()).toBe(false);
        });
    });

    describe('getForDate', () => {
        it('returns null when no record exists', () => {
            localStorageMock.getItem.mockReturnValueOnce(null);
            expect(getForDate('2024-12-28')).toBeNull();
        });

        it('returns record from localStorage when it exists', () => {
            const records = { '2024-12-28': createMockRecord('2024-12-28') };
            mockStorage['hanga_roa_hospital_data'] = JSON.stringify(records);

            const result = getForDate('2024-12-28');
            expect(result?.date).toBe('2024-12-28');
        });

        it('uses demo storage when demo mode is active', () => {
            setDemoModeActive(true);
            const records = { '2024-12-28': createMockRecord('2024-12-28') };
            mockStorage['hhr_demo_records'] = JSON.stringify(records);

            const result = getForDate('2024-12-28');
            expect(result?.date).toBe('2024-12-28');
        });
    });

    describe('getPreviousDay', () => {
        it('returns null when no previous record exists', () => {
            expect(getPreviousDay('2024-12-28')).toBeNull();
        });

        it('returns previous day record when it exists', () => {
            const records = {
                '2024-12-25': createMockRecord('2024-12-25'),
                '2024-12-27': createMockRecord('2024-12-27'),
            };
            mockStorage['hanga_roa_hospital_data'] = JSON.stringify(records);

            const result = getPreviousDay('2024-12-28');
            expect(result?.date).toBe('2024-12-27');
        });
    });
});
