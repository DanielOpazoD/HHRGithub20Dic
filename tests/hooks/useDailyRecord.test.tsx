import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDailyRecord } from '@/hooks/useDailyRecord';
import * as DailyRecordRepository from '@/services/repositories/DailyRecordRepository';
import * as localStorageService from '@/services/storage/localStorageService';
import { DailyRecord } from '@/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@/context/UIContext';
import React from 'react';
import { applyPatches } from '@/utils/patchUtils';

// Mock dependencies
vi.mock('@/services/repositories/DailyRecordRepository', () => ({
    getForDate: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    save: vi.fn().mockResolvedValue(undefined),
    updatePartial: vi.fn().mockResolvedValue(undefined),
    initializeDay: vi.fn().mockResolvedValue({}),
    deleteDay: vi.fn().mockResolvedValue(undefined),
    getPreviousDay: vi.fn().mockResolvedValue(null),
    syncWithFirestore: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/services/storage/localStorageService');

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <UIProvider>
                {children}
            </UIProvider>
        </QueryClientProvider>
    );
};

describe('useDailyRecord', () => {
    const mockDate = '2025-01-01';
    let currentRecord: DailyRecord | null = null;

    const createMockRecord = (date: string): DailyRecord => ({
        date,
        beds: {},
        discharges: [],
        transfers: [],
        lastUpdated: new Date().toISOString(),
        nurses: [],
        activeExtraBeds: [],
        cma: []
    });

    beforeEach(() => {
        vi.clearAllMocks();
        currentRecord = createMockRecord(mockDate);

        vi.mocked(DailyRecordRepository.getForDate).mockImplementation(async (date) => {
            if (currentRecord && currentRecord.date === date) return currentRecord;
            return null;
        });

        vi.mocked(DailyRecordRepository.initializeDay).mockImplementation(async (date) => {
            const rec = createMockRecord(date);
            currentRecord = rec;
            return rec;
        });

        vi.mocked(DailyRecordRepository.updatePartial).mockImplementation(async (date, partial) => {
            if (currentRecord && currentRecord.date === date) {
                currentRecord = applyPatches(currentRecord, partial);
            }
        });

        vi.mocked(DailyRecordRepository.save).mockImplementation(async (record) => {
            currentRecord = record;
        });
    });

    it('should initialize with record for the given date', async () => {
        const { result } = renderHook(() => useDailyRecord(mockDate), { wrapper: createWrapper() });

        await waitFor(() => {
            expect(result.current.record).not.toBeNull();
            expect(result.current.record?.date).toBe(mockDate);
        });
        expect(DailyRecordRepository.getForDate).toHaveBeenCalledWith(mockDate);
    });

    it('should update record when date changes', async () => {
        const { result, rerender } = renderHook(({ date }) => useDailyRecord(date), {
            initialProps: { date: mockDate },
            wrapper: createWrapper()
        });

        await waitFor(() => expect(result.current.record).not.toBeNull());

        const newDate = '2025-01-02';
        currentRecord = createMockRecord(newDate);

        rerender({ date: newDate });

        await waitFor(() => {
            expect(result.current.record?.date).toBe(newDate);
        });
    });

    it('should create a new day', async () => {
        const { result } = renderHook(() => useDailyRecord(mockDate), { wrapper: createWrapper() });

        // Wait for initial load (which might be null if currentRecord setup failed or similar)
        // But in our mock it returns currentRecord.

        await waitFor(() => expect(result.current.record).not.toBeNull());

        await act(async () => {
            await result.current.createDay(false);
        });

        expect(DailyRecordRepository.initializeDay).toHaveBeenCalledWith(mockDate, undefined);
        await waitFor(() => {
            expect(result.current.record?.date).toBe(mockDate);
        });
    });

    it('should not move patient if source bed is empty', async () => {
        currentRecord = {
            ...createMockRecord(mockDate),
            beds: {
                'bed1': { patientName: '', bedId: 'bed1' } as any,
                'bed2': { patientName: '', bedId: 'bed2' } as any
            }
        };

        const { result } = renderHook(() => useDailyRecord(mockDate), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.record?.beds['bed1']).toBeDefined());

        act(() => {
            result.current.moveOrCopyPatient('move', 'bed1', 'bed2');
        });

        // Should NOT call updatePartial/save because source was empty
        expect(DailyRecordRepository.updatePartial).not.toHaveBeenCalled();
    });

    it('should not update admissionDate to a future date', async () => {
        const { result } = renderHook(() => useDailyRecord(mockDate), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.record).not.toBeNull());

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 2);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        act(() => {
            result.current.updatePatient('bed1', 'admissionDate', futureDateStr);
        });

        expect(DailyRecordRepository.updatePartial).not.toHaveBeenCalled();
    });

    it('should not create clinical crib in empty bed', async () => {
        currentRecord = {
            ...createMockRecord(mockDate),
            beds: {
                'bed1': { patientName: '', bedId: 'bed1' } as any
            }
        };

        const { result } = renderHook(() => useDailyRecord(mockDate), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.record?.beds['bed1']).toBeDefined());

        act(() => {
            result.current.updateClinicalCrib('bed1', 'create');
        });

        expect(DailyRecordRepository.updatePartial).not.toHaveBeenCalled();
    });

    it('should not update crib admissionDate to a future date', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 2);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        currentRecord = {
            ...createMockRecord(mockDate),
            beds: {
                'bed1': {
                    patientName: 'Mom',
                    bedId: 'bed1',
                    clinicalCrib: { patientName: 'Baby', admissionDate: '2025-01-01' }
                } as any
            }
        };

        const { result } = renderHook(() => useDailyRecord(mockDate), { wrapper: createWrapper() });
        await waitFor(() => expect(result.current.record?.beds['bed1'].clinicalCrib).toBeDefined());

        act(() => {
            result.current.updateClinicalCrib('bed1', 'admissionDate', futureDateStr);
        });

        expect(DailyRecordRepository.updatePartial).not.toHaveBeenCalled();
    });
});
