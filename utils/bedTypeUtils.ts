import { BedDefinition, PatientData } from '../types';

const TOGGLEABLE_BED_IDS = new Set(['R1', 'R2', 'R3', 'R4']);

export const getBedTypeLabel = (bed: BedDefinition, patient?: PatientData): string => {
    return patient?.bedTypeLabel || bed.type;
};

export const isBedTypeToggleable = (bedId: string): boolean => TOGGLEABLE_BED_IDS.has(bedId);
