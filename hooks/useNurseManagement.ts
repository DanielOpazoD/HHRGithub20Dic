import { DailyRecord } from '../types';
import { DailyRecordPatchLoose } from './useDailyRecordTypes';

export const useNurseManagement = (
    record: DailyRecord | null,
    patchRecord: (partial: DailyRecordPatchLoose) => void
) => {

    const updateNurse = (shift: 'day' | 'night', index: number, name: string) => {
        if (!record) return;

        const field = shift === 'day' ? 'nursesDayShift' : 'nursesNightShift';

        // Use atomic path for reliable sync
        patchRecord({ [`${field}.${index}`]: name });
    };

    return {
        updateNurse
    };
};

export const useTensManagement = (
    record: DailyRecord | null,
    patchRecord: (partial: DailyRecordPatchLoose) => void
) => {

    const updateTens = (shift: 'day' | 'night', index: number, name: string) => {
        if (!record) return;

        const field = shift === 'day' ? 'tensDayShift' : 'tensNightShift';

        // Use atomic path for reliable sync
        patchRecord({ [`${field}.${index}`]: name });
    };

    return {
        updateTens
    };
};
