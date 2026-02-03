import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDailyRecord } from '@/hooks/useDailyRecord';
import { Specialty, PatientStatus } from '@/types';
import * as DailyRecordRepository from '@/services/repositories/DailyRecordRepository';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@/context/UIContext';
import React from 'react';
import { applyPatches } from '@/utils/patchUtils';

// Mock the repository and other services that the hook uses
vi.mock('@/services/repositories/DailyRecordRepository', () => ({
    getPreviousDay: vi.fn(),
    initializeDay: vi.fn(),
    save: vi.fn(),
    deleteDay: vi.fn(),
    getForDate: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    updatePartial: vi.fn().mockResolvedValue(undefined),
    syncWithFirestore: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/services/storage/localStorageService', () => ({
    saveRecordToLocalStorage: vi.fn(),
    getRecordFromLocalStorage: vi.fn()
}));

vi.mock('@/context/UIContext', () => ({
    useNotification: () => ({
        success: vi.fn(),
        warning: vi.fn(),
        error: vi.fn(),
    }),
    useUI: () => ({
        success: vi.fn(),
        warning: vi.fn(),
        error: vi.fn(),
        confirm: vi.fn(),
        alert: vi.fn(),
    }),
    UIProvider: ({ children }: { children: React.ReactNode }) => children
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, staleTime: Infinity },
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

describe('Patient Flow Integration', () => {
    let currentRecord: any = null;

    beforeEach(() => {
        vi.clearAllMocks();
        currentRecord = null;

        // Setup a blank record mit real bed IDs
        vi.mocked(DailyRecordRepository.initializeDay).mockImplementation(async (date) => {
            currentRecord = {
                date,
                beds: {
                    'R1': { bedId: 'R1', patientName: '', rut: '', pathology: '', specialty: Specialty.MEDICINA, status: PatientStatus.ESTABLE, bedMode: 'Cama', hasCompanionCrib: false, isBlocked: false, admissionDate: date, devices: [], hasWristband: true, surgicalComplication: false, isUPC: false, age: '' }
                },
                discharges: [],
                transfers: [],
                cma: [],
                lastUpdated: new Date().toISOString(),
                nurses: [],
                nursesDayShift: ['', ''],
                nursesNightShift: ['', ''],
                tensDayShift: ['', '', ''],
                tensNightShift: ['', '', ''],
                activeExtraBeds: []
            };
            return currentRecord;
        });

        vi.mocked(DailyRecordRepository.getForDate).mockImplementation(async () => currentRecord);
        vi.mocked(DailyRecordRepository.save).mockImplementation(async (record) => {
            currentRecord = record;
        });
        vi.mocked(DailyRecordRepository.updatePartial).mockImplementation(async (date, partial) => {
            if (currentRecord) {
                currentRecord = applyPatches(currentRecord, partial);
            }
        });
    });

    it('should handle a full patient lifecycle: admission, update, discharge, undo', async () => {
        const { result } = renderHook(() => useDailyRecord('2024-12-11'), { wrapper: createWrapper() });

        // 1. Admission
        await act(async () => {
            await result.current.createDay(false);
        });

        await waitFor(() => expect(result.current.record).not.toBeNull());

        act(() => { result.current.updatePatient('R1', 'patientName', 'Juan Pérez'); });
        act(() => { result.current.updatePatient('R1', 'rut', '12.345.678-9'); });
        act(() => { result.current.updatePatient('R1', 'pathology', 'Neumonía'); });

        await waitFor(() => {
            expect(result.current.record?.beds['R1'].patientName).toBe('Juan Pérez');
            expect(result.current.record?.beds['R1'].pathology).toBe('Neumonía');
        });

        // 2. Update status
        act(() => {
            result.current.updatePatient('R1', 'status', PatientStatus.GRAVE);
        });
        await waitFor(() => expect(result.current.record?.beds['R1'].status).toBe(PatientStatus.GRAVE));

        // 3. Discharge
        act(() => {
            result.current.addDischarge('R1', 'Vivo', undefined, 'Domicilio (Habitual)');
        });

        await waitFor(() => {
            expect(result.current.record?.beds['R1'].patientName).toBe('');
            expect(result.current.record?.discharges.length).toBe(1);
            expect(result.current.record?.discharges[0].patientName).toBe('Juan Pérez');
        });

        // 4. Undo discharge
        const dischargeId = result.current.record?.discharges[0].id;
        act(() => {
            if (dischargeId) result.current.undoDischarge(dischargeId);
        });

        await waitFor(() => {
            expect(result.current.record?.beds['R1'].patientName).toBe('Juan Pérez');
            expect(result.current.record?.discharges.length).toBe(0);
        });
    });

    it('should handle patient transfer and undo', async () => {
        const { result } = renderHook(() => useDailyRecord('2024-12-12'), { wrapper: createWrapper() });

        await act(async () => {
            await result.current.createDay(false);
        });

        await waitFor(() => expect(result.current.record).not.toBeNull());

        act(() => { result.current.updatePatient('R1', 'patientName', 'María García'); });
        act(() => { result.current.updatePatient('R1', 'pathology', 'Sepsis'); });

        await waitFor(() => {
            expect(result.current.record?.beds['R1'].patientName).toBe('María García');
        });

        // 1. Transfer
        act(() => {
            result.current.addTransfer('R1', 'Ambulancia', '', 'Hospital Regional', '');
        });

        await waitFor(() => {
            expect(result.current.record?.beds['R1'].patientName).toBe('');
            expect(result.current.record?.transfers.length).toBe(1);
            expect(result.current.record?.transfers[0].patientName).toBe('María García');
        });

        // 2. Undo transfer
        const transferId = result.current.record?.transfers[0].id;
        act(() => {
            if (transferId) result.current.undoTransfer(transferId);
        });

        await waitFor(() => {
            expect(result.current.record?.beds['R1'].patientName).toBe('María García');
            expect(result.current.record?.transfers.length).toBe(0);
        });
    });
});
