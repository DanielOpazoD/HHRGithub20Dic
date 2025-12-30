import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDailyRecordSync } from '../../hooks/useDailyRecordSync';
import { DailyRecord } from '../../types';
import { ConcurrencyError } from '../../services/storage/firestoreService';

// Mocks
const mockSave = vi.fn();
const mockGetForDate = vi.fn();
const mockNotificationError = vi.fn();

vi.mock('../../services/repositories/DailyRecordRepository', () => ({
    getForDate: (date: string) => mockGetForDate(date),
    save: (record: DailyRecord, expected?: string) => mockSave(record, expected),
    subscribe: () => () => { },
    syncWithFirestore: () => Promise.resolve(null),
    updatePartial: vi.fn(),
}));

vi.mock('../../context/UIContext', () => ({
    useNotification: () => ({
        error: mockNotificationError,
        success: vi.fn(),
    }),
}));

vi.mock('../../firebaseConfig', () => ({
    auth: { onAuthStateChanged: vi.fn(() => () => { }) },
}));

vi.mock('../../services/storage/localStorageService', () => ({
    saveRecordLocal: vi.fn(),
}));

const createMockRecord = (date: string): DailyRecord => ({
    date,
    lastUpdated: '2024-12-28T10:00:00Z',
    beds: {}, discharges: [], transfers: [], cma: [], nurses: []
} as any);

describe('Concurrency Handling Integration', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        mockGetForDate.mockResolvedValue(createMockRecord('2024-12-28'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should handle ConcurrencyError correctly', async () => {
        // Setup: Repository throws ConcurrencyError on save
        mockSave.mockRejectedValue(new ConcurrencyError('Remote is newer'));

        const { result } = renderHook(() => useDailyRecordSync('2024-12-28'));

        // Wait for mount
        await act(async () => { await Promise.resolve(); });

        const newRecord = { ...result.current.record!, lastUpdated: '2024-12-28T10:00:01Z' };

        // Action: Try to save
        await act(async () => {
            await result.current.saveAndUpdate(newRecord);
            // Advance timers slightly to allow catch block to execute
            await vi.advanceTimersByTimeAsync(100);
        });

        // Assertions
        expect(result.current.syncStatus).toBe('error');
        expect(mockNotificationError).toHaveBeenCalledWith('Conflicto de Edición', 'Remote is newer');

        // Verify Refresh Logic
        // The hook sets a timeout of 2000ms to refresh
        mockGetForDate.mockClear(); // Clear initial load call

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        expect(mockGetForDate).toHaveBeenCalledWith('2024-12-28');
    });
});
