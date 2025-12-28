import { DailyRecord } from '../types';
import { DailyRecordPatchLoose } from './useDailyRecordTypes';

export const useNurseManagement = (
    record: DailyRecord | null,
    patchRecord: (partial: DailyRecordPatchLoose) => Promise<void>
) => {

    const updateNurse = async (shift: 'day' | 'night', index: number, name: string) => {
        console.log('[NurseManagement] updateNurse called:', shift, index, name, 'record:', !!record);
        if (!record) return;

        const field = shift === 'day' ? 'nursesDayShift' : 'nursesNightShift';

        // Get current array and create a new one with the updated value
        // IMPORTANT: Send the complete array to Firestore, not individual indices
        // Firestore doesn't handle array index updates via dot notation well
        const currentArray = [...(record[field] || ['', ''])];
        // Ensure array has at least index+1 elements
        while (currentArray.length <= index) {
            currentArray.push('');
        }
        currentArray[index] = name;

        console.log('[NurseManagement] Sending complete array:', field, '=', currentArray);
        await patchRecord({ [field]: currentArray });
    };

    return {
        updateNurse
    };
};

export const useTensManagement = (
    record: DailyRecord | null,
    patchRecord: (partial: DailyRecordPatchLoose) => Promise<void>
) => {

    const updateTens = async (shift: 'day' | 'night', index: number, name: string) => {
        if (!record) return;

        const field = shift === 'day' ? 'tensDayShift' : 'tensNightShift';

        // Get current array and create a new one with the updated value
        // IMPORTANT: Send the complete array to Firestore, not individual indices
        // Firestore doesn't handle array index updates via dot notation well
        const currentArray = [...(record[field] || ['', '', ''])];
        // Ensure array has at least index+1 elements
        while (currentArray.length <= index) {
            currentArray.push('');
        }
        currentArray[index] = name;

        console.log('[TensManagement] Sending complete array:', field, '=', currentArray);
        await patchRecord({ [field]: currentArray });
    };

    return {
        updateTens
    };
};
