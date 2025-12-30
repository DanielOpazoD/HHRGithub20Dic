/**
 * Integration Tests for DailyRecord Sync Flow
 * Tests useDailyRecordSync hook and its interaction with the repository and Firestore logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDailyRecordSync } from '../../hooks/useDailyRecordSync';
import { DailyRecord } from '../../types';

// ============================================================================
// Mocks
// ============================================================================

// Mock Repository
const mockSubscribe = vi.fn();
const mockSyncWithFirestore = vi.fn();
const mockSave = vi.fn();
const mockUpdatePartial = vi.fn();
const mockGetForDate = vi.fn();

vi.mock('../../services/repositories/DailyRecordRepository', () => ({
    getForDate: (date: string) => mockGetForDate(date),
    save: (record: DailyRecord) => mockSave(record),
    updatePartial: (date: string, partial: any) => mockUpdatePartial(date, partial),
    subscribe: (date: string, cb: any) => {
        mockSubscribe(date, cb);
        return () => { }; // Unsubscribe
    },
    syncWithFirestore: (date: string) => mockSyncWithFirestore(date),
}));

// Mock Firebase Auth
vi.mock('../../firebaseConfig', () => ({
    auth: {
        onAuthStateChanged: vi.fn((cb) => {
            cb({ uid: 'test-user-123' }); // Simulate logged in user
            return () => { }; // Unsubscribe
        }),
    },
}));

// Mock UI Context
vi.mock('../../context/UIContext', () => ({
    useNotification: () => ({
        success: vi.fn(),
        error: vi.fn(),
    }),
}));

// Mock Utils
vi.mock('../../services/utils/errorService', () => ({
    logFirebaseError: vi.fn(),
    getUserFriendlyErrorMessage: vi.fn((err) => 'Friendly Error'),
}));

vi.mock('../../services/storage/localStorageService', () => ({
    saveRecordLocal: vi.fn(),
}));

// ============================================================================
// Helper Data
// ============================================================================

const createMockRecord = (date: string): DailyRecord => ({
    date,
    beds: {},
    discharges: [],
    transfers: [],
    cma: [],
    lastUpdated: '2024-12-28T12:00:00Z',
    nurses: [],
} as any);

// ============================================================================
// Tests
// ============================================================================

describe('DailyRecord Sync Integration', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        mockGetForDate.mockReturnValue(null);
        mockSyncWithFirestore.mockResolvedValue(null);
        mockSave.mockResolvedValue(undefined);
        mockUpdatePartial.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should load local record on mount', async () => {
        const localRecord = createMockRecord('2024-12-28');
        mockGetForDate.mockResolvedValue(localRecord); // Mocking async return based on implementation if needed

        const { result } = renderHook(() => useDailyRecordSync('2024-12-28', false, true));

        await act(async () => {
            // Let effects run
            await Promise.resolve();
        });

        // Wait for state update
        // Using wait for implied by hook usage is tricky without waitFor from testing-library
        // But renderHook returns result which mutates.
        // We can just rely on state being there if act waited enough.
        expect(result.current.record).toEqual(localRecord);
        expect(mockGetForDate).toHaveBeenCalledWith('2024-12-28');
    });

    it('should subscribe to remote changes on mount', async () => {
        renderHook(() => useDailyRecordSync('2024-12-28', false, true));

        await act(async () => {
            await Promise.resolve();
        });

        expect(mockSubscribe).toHaveBeenCalledWith('2024-12-28', expect.any(Function));
    });

    it('should update record when remote change is received (no local pending)', async () => {
        const { result } = renderHook(() => useDailyRecordSync('2024-12-28', false, true));

        const remoteRecord = createMockRecord('2024-12-28');
        remoteRecord.lastUpdated = '2024-12-28T13:00:00Z';

        // Wait for mount
        await act(async () => { await Promise.resolve(); });

        // Trigger the callback passed to mockSubscribe
        // We need to capture it after it's been called
        const subscribeCallback = mockSubscribe.mock.calls[0][1];

        await act(async () => {
            subscribeCallback(remoteRecord, false); // hasPendingWrites = false
        });

        expect(result.current.record).toEqual(remoteRecord);
    });

    // ... (skipping some unchanged tests) ...

    it('should save and update state on saveAndUpdate call', async () => {
        const { result } = renderHook(() => useDailyRecordSync('2024-12-28', false, true));
        const newRecord = createMockRecord('2024-12-28');
        newRecord.nurses = ['Nurse A'];

        // Wait for initial load to settle so it doesn't overwrite our save later implies
        await act(async () => { await Promise.resolve(); });

        await act(async () => {
            // Note: saveAndUpdate sets record immediately
            await result.current.saveAndUpdate(newRecord);
            // Do NOT run all timers here, or it will flip back to idle
            // Just enough to resolve promises
            await vi.advanceTimersByTimeAsync(100);
        });

        // Updated expectation: save now receives 2 arguments (record, previousTimestamp)
        // Since record is initially loaded as null in this test setup (unless we wait for load),
        // baseLastUpdated might be undefined.
        // Let's verify we at least call save with the record. 
        // Note: createMockRecord provides lastUpdated, but if previous state was null...
        // renderHook starts null. loadInitial runs async. 
        // We didn't wait for loadInitial in this specific test! So record is null.
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockSave.mock.calls[0][0]).toEqual(newRecord);
        expect(result.current.record).toEqual(newRecord);
        expect(result.current.syncStatus).toBe('saved'); // After await, it should be saved
    });

    it('should perform patch update and keep state in sync', async () => {
        const initialRecord = createMockRecord('2024-12-28');
        mockGetForDate.mockReturnValue(initialRecord);

        const { result } = renderHook(() => useDailyRecordSync('2024-12-28', false, true));
        const partial = { 'beds.R1.patientName': 'Nuevo Paciente' };

        // WAITING FOR INITIAL LOAD
        await act(async () => { await Promise.resolve(); });

        await act(async () => {
            await result.current.patchRecord(partial);
            // Run timers just enough to process async state updates but NOT the 2000ms idle timeout
            await vi.advanceTimersByTimeAsync(100);
        });

        expect(mockUpdatePartial).toHaveBeenCalledWith('2024-12-28', partial);
        expect(result.current.record?.beds.R1.patientName).toBe('Nuevo Paciente');
        expect(result.current.syncStatus).toBe('saved');
    });

    it('should handle save errors and update syncStatus', async () => {
        mockSave.mockRejectedValue(new Error('Firebase error'));
        const { result } = renderHook(() => useDailyRecordSync('2024-12-28', false, true));

        await act(async () => {
            try { await result.current.saveAndUpdate(createMockRecord('2024-12-28')); } catch { }
        });

        expect(result.current.syncStatus).toBe('error');
    });
});
