/**
 * useDailyRecordSync Hook
 * Handles real-time synchronization with Firebase and local persistence.
 * Extracted from useDailyRecord for better separation of concerns.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DailyRecord } from '../types';
import { useNotification } from '../context/UIContext';
import { validateDailyRecord } from '../schemas/validation';
import { DailyRecordPatchLoose } from './useDailyRecordTypes';
import { logFirebaseError, getUserFriendlyErrorMessage } from '../services/utils/errorService';

import {
    getForDate,
    save,
    updatePartial,
    subscribe,
    DailyRecordRepository,
    syncWithFirestore
} from '../services/repositories/DailyRecordRepository';
import { auth } from '../firebaseConfig';
import { applyPatches } from '../utils/patchUtils';

// Debounce for sync protection - prevents flickering during rapid local changes
const SYNC_DEBOUNCE_MS = 1000;

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseDailyRecordSyncResult {
    record: DailyRecord | null;
    setRecord: (record: DailyRecord | null | ((prev: DailyRecord | null) => DailyRecord | null)) => void;
    syncStatus: SyncStatus;
    lastSyncTime: Date | null;
    saveAndUpdate: (updatedRecord: DailyRecord) => Promise<void>;
    patchRecord: (partial: DailyRecordPatchLoose) => Promise<void>;
    markLocalChange: () => void;
    refresh: () => void;
}

/**
 * Hook that manages sync state and real-time updates from Firebase.
 */
export const useDailyRecordSync = (
    currentDateString: string,
    isOfflineMode: boolean = false,
    isFirebaseConnected: boolean = false
): UseDailyRecordSyncResult => {
    const [record, setRecord] = useState<DailyRecord | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const { error } = useNotification();

    // Refs for sync management
    const isSavingRef = useRef(false);
    const lastLocalChangeRef = useRef<number>(0);

    /**
     * Effect: Loads the initial record state from local storage on date change.
     */
    useEffect(() => {
        const loadInitial = async () => {
            const existing = await getForDate(currentDateString);
            setRecord(existing || null);
        };
        loadInitial();
    }, [currentDateString]);

    /**
     * Effect: Establishes a real-time subscription to the Firestore repository.
     * Implements echo protection to prevent flickering from local updates.
     */
    useEffect(() => {
        if (!isFirebaseConnected || isOfflineMode) return;

        console.log('[Sync] Initializing Firestore subscription for:', currentDateString);
        const unsubRepo = subscribe(currentDateString, async (remoteRecord, hasPendingWrites) => {
            if (!remoteRecord) {
                // If we are online and there is NO remote record, we might want to push local
                // but subscribe is mostly for updates.
                return;
            }

            const now = Date.now();
            const timeSinceLastChange = now - lastLocalChangeRef.current;

            // 1. If Firestore says it's a pending local write, IGNORE it.
            if (hasPendingWrites) {
                return;
            }

            // 2. If we are currently saving and the change is VERY fresh, ignore to be safe.
            if (isSavingRef.current && timeSinceLastChange < 500) {
                return;
            }

            // 3. Otherwise, ACCEPT the remote update.
            console.log('[Sync] Applying remote change, lastUpdated:', remoteRecord.lastUpdated);
            setRecord(remoteRecord);
            setLastSyncTime(new Date());
            setSyncStatus('saved');
        });

        return () => {
            if (unsubRepo) unsubRepo();
        };
    }, [currentDateString, isFirebaseConnected, isOfflineMode]);

    /**
     * Effect: Performs a deep sync (force pull) from Firestore on mount or reconnection.
     * Ensures local storage is consistent with the latest cloud version.
     */
    useEffect(() => {
        const performDeepSync = async () => {
            if (isFirebaseConnected && navigator.onLine && !isOfflineMode) {
                console.log('[useDailyRecordSync] Deep sync triggered for:', currentDateString);

                try {
                    const remoteRecord = await syncWithFirestore(currentDateString);
                    const localRecord = await getForDate(currentDateString);

                    if (remoteRecord) {
                        if (!localRecord || new Date(remoteRecord.lastUpdated) > new Date(localRecord.lastUpdated)) {
                            console.log('[useDailyRecordSync] Firestore version is newer or local missing. Updating state.');
                            setRecord(remoteRecord);
                            setSyncStatus('saved');
                            setLastSyncTime(new Date());
                        } else {
                            console.log('[useDailyRecordSync] Local version is newer or equal. Keeping local.');
                            setRecord(localRecord);
                        }
                    } else if (localRecord) {
                        console.log('[useDailyRecordSync] Local data found but no Firestore record. Pushing local to cloud.');
                        await save(localRecord);
                        setSyncStatus('saved');
                        setLastSyncTime(new Date());
                    }
                } catch (err) {
                    console.error('[useDailyRecordSync] Deep sync failed:', err);
                }
            }
        };

        performDeepSync();
    }, [currentDateString, isFirebaseConnected, isOfflineMode]);

    // ========================================================================
    // Utility Functions (Declared before usage)
    // ========================================================================
    /**
     * Manually updates the timestamp of the last local change.
     * Used by components to signal that they are taking control of the data.
     */
    const markLocalChange = useCallback(() => {
        lastLocalChangeRef.current = Date.now();
    }, []);

    /**
     * Force re-loads the current date's record from local storage into the state.
     */
    const refresh = useCallback(async () => {
        const existing = await getForDate(currentDateString);
        setRecord(existing || null);
    }, [currentDateString]);

    // ========================================================================
    // Save Handler
    // ========================================================================
    /**
     * Saves the complete DailyRecord to both local storage and Firestore.
     * Updates the local state and sync status.
     * 
     * @param updatedRecord - The new record state to persist
     * @returns Promise that resolves when the save operation completes
     */
    const saveAndUpdate = useCallback(async (updatedRecord: DailyRecord) => {
        isSavingRef.current = true;
        lastLocalChangeRef.current = Date.now();

        setRecord(updatedRecord);
        setSyncStatus('saving');

        try {
            // Capture the last known version timestamp BEFORE saving local state
            // "record" is the state before the update (closure capture), but let's be safe
            // Assuming "record" in scope is the PREVIOUS state because saveAndUpdate is recreated on record change?
            // Actually, saveAndUpdate depends on [error] only in my previous read?
            // Let's rely on finding the previous lastUpdated. 
            // Better yet, `record` (from state) is the base.
            const baseLastUpdated = record?.lastUpdated;

            await save(updatedRecord, baseLastUpdated);
            setSyncStatus('saved');
            setLastSyncTime(new Date());
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err: unknown) {
            console.error('Save failed:', err);

            if (err instanceof Error && err.name === 'ConcurrencyError') {
                setSyncStatus('error');
                error('Conflicto de Edición', err.message);
                // Force refresh to get latest data
                setTimeout(() => refresh(), 2000);
                return;
            }

            setSyncStatus('error');

            // Log error to centralized service
            logFirebaseError(err, 'saveAndUpdate', {
                date: updatedRecord.date,
                recordSize: JSON.stringify(updatedRecord).length,
            });

            // Show user-friendly error message
            const friendlyMessage = getUserFriendlyErrorMessage(err);
            error('Error al guardar', friendlyMessage);
        } finally {
            setTimeout(() => {
                isSavingRef.current = false;
            }, 1000); // Wait 1s after operation ends to release lock
        }
    }, [record, error, refresh]);

    /**
     * Performs an optimistic partial update to the DailyRecord.
     * Uses dot-notation paths for efficient Firestore updates.
     * 
     * @param partial - Object containing key paths and values to update
     * @returns Promise that resolves when the patch is applied
     * 
     * @example
     * ```typescript
     * await patchRecord({ 'beds.B01.patientName': 'Juan Pérez' });
     * ```
     */
    const patchRecord = useCallback(async (partial: DailyRecordPatchLoose) => {
        isSavingRef.current = true;
        lastLocalChangeRef.current = Date.now();

        // Optimistic update
        setRecord(prev => {
            if (!prev) return null;
            const updated = applyPatches(prev, partial);
            updated.lastUpdated = new Date().toISOString();
            return updated;
        });

        setSyncStatus('saving');

        try {
            await updatePartial(currentDateString, partial);
            setSyncStatus('saved');
            setLastSyncTime(new Date());
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err) {
            console.error('Patch failed:', err);
            setSyncStatus('error');
            error('Error al actualizar', getUserFriendlyErrorMessage(err));
        } finally {
            setTimeout(() => {
                isSavingRef.current = false;
            }, 1000); // Wait 1s after operation ends to release lock
        }
    }, [currentDateString, error]);


    return {
        record,
        setRecord,
        syncStatus,
        lastSyncTime,
        saveAndUpdate,
        patchRecord,
        markLocalChange,
        refresh
    };
};
