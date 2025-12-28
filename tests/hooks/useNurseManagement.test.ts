import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNurseManagement, useTensManagement } from '@/hooks/useNurseManagement';
import { DailyRecord } from '@/types';

describe('useNurseManagement', () => {
    const mockPatchRecord = vi.fn();

    const createMockRecord = (overrides: Partial<DailyRecord> = {}): DailyRecord => ({
        date: '2025-12-28',
        beds: {},
        discharges: [],
        transfers: [],
        cma: [],
        lastUpdated: new Date().toISOString(),
        nurses: ['', ''],
        nursesDayShift: ['', ''],
        nursesNightShift: ['', ''],
        tensDayShift: ['', '', ''],
        tensNightShift: ['', '', ''],
        activeExtraBeds: [],
        ...overrides
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('updateNurse', () => {
        it('should send complete array when updating day shift nurse at index 0', () => {
            const mockRecord = createMockRecord({
                nursesDayShift: ['', '']
            });

            const { result } = renderHook(() => useNurseManagement(mockRecord, mockPatchRecord));

            act(() => {
                result.current.updateNurse('day', 0, 'María López');
            });

            expect(mockPatchRecord).toHaveBeenCalledWith({
                nursesDayShift: ['María López', '']
            });
        });

        it('should send complete array when updating day shift nurse at index 1', () => {
            const mockRecord = createMockRecord({
                nursesDayShift: ['María López', '']
            });

            const { result } = renderHook(() => useNurseManagement(mockRecord, mockPatchRecord));

            act(() => {
                result.current.updateNurse('day', 1, 'Juan Pérez');
            });

            expect(mockPatchRecord).toHaveBeenCalledWith({
                nursesDayShift: ['María López', 'Juan Pérez']
            });
        });

        it('should send complete array when updating night shift nurse', () => {
            const mockRecord = createMockRecord({
                nursesNightShift: ['Ana García', '']
            });

            const { result } = renderHook(() => useNurseManagement(mockRecord, mockPatchRecord));

            act(() => {
                result.current.updateNurse('night', 1, 'Pedro Soto');
            });

            expect(mockPatchRecord).toHaveBeenCalledWith({
                nursesNightShift: ['Ana García', 'Pedro Soto']
            });
        });

        it('should not call patchRecord if record is null', () => {
            const { result } = renderHook(() => useNurseManagement(null, mockPatchRecord));

            act(() => {
                result.current.updateNurse('day', 0, 'Test Nurse');
            });

            expect(mockPatchRecord).not.toHaveBeenCalled();
        });

        it('should handle undefined nursesDayShift gracefully', () => {
            const mockRecord = createMockRecord({
                nursesDayShift: undefined as any
            });

            const { result } = renderHook(() => useNurseManagement(mockRecord, mockPatchRecord));

            act(() => {
                result.current.updateNurse('day', 0, 'Test Nurse');
            });

            expect(mockPatchRecord).toHaveBeenCalledWith({
                nursesDayShift: ['Test Nurse', '']
            });
        });

        it('should preserve existing nurses when updating one slot', () => {
            const mockRecord = createMockRecord({
                nursesDayShift: ['Existing Nurse 1', 'Existing Nurse 2']
            });

            const { result } = renderHook(() => useNurseManagement(mockRecord, mockPatchRecord));

            act(() => {
                result.current.updateNurse('day', 0, 'New Nurse');
            });

            expect(mockPatchRecord).toHaveBeenCalledWith({
                nursesDayShift: ['New Nurse', 'Existing Nurse 2']
            });
        });
    });
});

describe('useTensManagement', () => {
    const mockPatchRecord = vi.fn();

    const createMockRecord = (overrides: Partial<DailyRecord> = {}): DailyRecord => ({
        date: '2025-12-28',
        beds: {},
        discharges: [],
        transfers: [],
        cma: [],
        lastUpdated: new Date().toISOString(),
        nurses: ['', ''],
        nursesDayShift: ['', ''],
        nursesNightShift: ['', ''],
        tensDayShift: ['', '', ''],
        tensNightShift: ['', '', ''],
        activeExtraBeds: [],
        ...overrides
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('updateTens', () => {
        it('should send complete array when updating day shift TENS at index 0', () => {
            const mockRecord = createMockRecord({
                tensDayShift: ['', '', '']
            });

            const { result } = renderHook(() => useTensManagement(mockRecord, mockPatchRecord));

            act(() => {
                result.current.updateTens('day', 0, 'Carlos Fernández');
            });

            expect(mockPatchRecord).toHaveBeenCalledWith({
                tensDayShift: ['Carlos Fernández', '', '']
            });
        });

        it('should send complete array when updating day shift TENS at index 2', () => {
            const mockRecord = createMockRecord({
                tensDayShift: ['TENS 1', 'TENS 2', '']
            });

            const { result } = renderHook(() => useTensManagement(mockRecord, mockPatchRecord));

            act(() => {
                result.current.updateTens('day', 2, 'TENS 3');
            });

            expect(mockPatchRecord).toHaveBeenCalledWith({
                tensDayShift: ['TENS 1', 'TENS 2', 'TENS 3']
            });
        });

        it('should send complete array when updating night shift TENS', () => {
            const mockRecord = createMockRecord({
                tensNightShift: ['Night TENS 1', '', '']
            });

            const { result } = renderHook(() => useTensManagement(mockRecord, mockPatchRecord));

            act(() => {
                result.current.updateTens('night', 1, 'Night TENS 2');
            });

            expect(mockPatchRecord).toHaveBeenCalledWith({
                tensNightShift: ['Night TENS 1', 'Night TENS 2', '']
            });
        });

        it('should not call patchRecord if record is null', () => {
            const { result } = renderHook(() => useTensManagement(null, mockPatchRecord));

            act(() => {
                result.current.updateTens('day', 0, 'Test TENS');
            });

            expect(mockPatchRecord).not.toHaveBeenCalled();
        });

        it('should handle undefined tensDayShift gracefully', () => {
            const mockRecord = createMockRecord({
                tensDayShift: undefined as any
            });

            const { result } = renderHook(() => useTensManagement(mockRecord, mockPatchRecord));

            act(() => {
                result.current.updateTens('day', 0, 'Test TENS');
            });

            expect(mockPatchRecord).toHaveBeenCalledWith({
                tensDayShift: ['Test TENS', '', '']
            });
        });

        it('should preserve existing TENS when updating one slot', () => {
            const mockRecord = createMockRecord({
                tensDayShift: ['TENS A', 'TENS B', 'TENS C']
            });

            const { result } = renderHook(() => useTensManagement(mockRecord, mockPatchRecord));

            act(() => {
                result.current.updateTens('day', 1, 'New TENS');
            });

            expect(mockPatchRecord).toHaveBeenCalledWith({
                tensDayShift: ['TENS A', 'New TENS', 'TENS C']
            });
        });
    });
});
