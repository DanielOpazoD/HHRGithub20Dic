import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDailyRecordSync } from '@/hooks/useDailyRecordSync';
import { auth } from '@/firebaseConfig';
import * as DailyRecordRepository from '@/services/repositories/DailyRecordRepository';
import { UIProvider } from '@/context/UIContext';

// Mock Firebase Auth
vi.mock('@/firebaseConfig', () => ({
    auth: {
        onAuthStateChanged: vi.fn(() => vi.fn()),
    },
}));

// Mock Repository
vi.mock('@/services/repositories/DailyRecordRepository', () => ({
    getForDate: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(() => vi.fn()),
    syncWithFirestore: vi.fn().mockResolvedValue(null),
}));

describe('useDailyRecordSync - Reconnection Logic', () => {
    const mockDate = '2025-12-27';
    const mockRecord = { id: 'rec-1', date: mockDate, beds: {}, lastUpdated: new Date().toISOString() };

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock navigator.onLine
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: true,
            writable: true,
        });
    });

    it('should push local data to Firestore if Online and isFirebaseConnected is true', async () => {
        // Setup mocks
        (DailyRecordRepository.getForDate as any).mockReturnValue(mockRecord);

        // Render hook with isFirebaseConnected = true
        renderHook(() => useDailyRecordSync(mockDate, false, true), {
            wrapper: UIProvider
        });

        // Verify push logic
        await waitFor(() => {
            expect(DailyRecordRepository.save).toHaveBeenCalledWith(mockRecord);
        });
    });

    it('should pull from Firestore if Online and NO local data exists', async () => {
        // Setup mocks
        (DailyRecordRepository.getForDate as any).mockReturnValue(null);
        (DailyRecordRepository.syncWithFirestore as any).mockResolvedValue(mockRecord);

        // Render hook with isFirebaseConnected = true
        renderHook(() => useDailyRecordSync(mockDate, false, true), {
            wrapper: UIProvider
        });

        // Verify pull logic
        await waitFor(() => {
            expect(DailyRecordRepository.syncWithFirestore).toHaveBeenCalledWith(mockDate);
        });
    });

    it('should NOT sync if navigator is offline', async () => {
        // Set offline
        Object.defineProperty(navigator, 'onLine', { value: false });

        renderHook(() => useDailyRecordSync(mockDate, false, true), {
            wrapper: UIProvider
        });

        // Verify no sync calls even if connected
        expect(DailyRecordRepository.save).not.toHaveBeenCalled();
        expect(DailyRecordRepository.syncWithFirestore).not.toHaveBeenCalled();
    });
});
