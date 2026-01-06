import { BEDS } from '../../constants';
import { BedDefinition, BedType, DailyRecord, PatientData } from '../../types';
import { getCategorization } from '../../views/cudyr/CudyrScoreUtils';
import { getRecordsForMonth } from '../storage/indexedDBService';

export type BedTypeKey = 'UTI' | 'MEDIA';

export type CudyrCategoryCode =
    | 'A1' | 'A2' | 'A3'
    | 'B1' | 'B2' | 'B3'
    | 'C1' | 'C2' | 'C3'
    | 'D1' | 'D2' | 'D3';

export const CATEGORY_CODES: CudyrCategoryCode[] = [
    'A1', 'A2', 'A3',
    'B1', 'B2', 'B3',
    'C1', 'C2', 'C3',
    'D1', 'D2', 'D3'
];

const createEmptyCategoryMap = (): Record<CudyrCategoryCode, number> =>
    CATEGORY_CODES.reduce((acc, code) => {
        acc[code] = 0;
        return acc;
    }, {} as Record<CudyrCategoryCode, number>);

const getActiveBeds = (record: DailyRecord): BedDefinition[] => {
    const activeExtras = record.activeExtraBeds || [];
    return BEDS.filter(bed => !bed.isExtra || activeExtras.includes(bed.id));
};

interface ClassifiedCudyrPatient {
    bedId: string;
    bedName: string;
    bedType: BedTypeKey;
    patientName: string;
    rut: string;
    depScore: number;
    riskScore: number;
    category: CudyrCategoryCode;
    isCategorized: boolean;
    isNested?: boolean;
}

const classifyPatient = (
    bed: BedDefinition,
    patient: PatientData | undefined,
    isNested: boolean = false
): ClassifiedCudyrPatient | null => {
    if (!patient || patient.isBlocked || !patient.patientName?.trim()) {
        return null;
    }

    const { depScore, riskScore, finalCat, isCategorized } = getCategorization(patient.cudyr);
    const bedType: BedTypeKey = bed.type === BedType.UTI ? 'UTI' : 'MEDIA';

    return {
        bedId: bed.id,
        bedName: isNested ? `${bed.name} (Cuna)` : bed.name,
        bedType,
        patientName: patient.patientName,
        rut: patient.rut,
        depScore,
        riskScore,
        category: finalCat as CudyrCategoryCode,
        isCategorized,
        isNested
    };
};

export const collectDailyCudyrPatients = (record: DailyRecord): ClassifiedCudyrPatient[] => {
    const patients: ClassifiedCudyrPatient[] = [];
    const beds = getActiveBeds(record);

    beds.forEach(bed => {
        const patient = record.beds[bed.id];
        const mainClassification = classifyPatient(bed, patient);
        if (mainClassification) {
            patients.push(mainClassification);
        }

        const nestedClassification = classifyPatient(bed, patient?.clinicalCrib, true);
        if (nestedClassification) {
            patients.push(nestedClassification);
        }
    });

    return patients;
};

export interface CudyrDailySummary {
    date: string;
    occupiedPatients: number;
    categorizedPatients: number;
    countsByType: Record<BedTypeKey, Record<CudyrCategoryCode, number>>;
    totalsByType: Record<BedTypeKey, number>;
    totalsByCategory: Record<CudyrCategoryCode, number>;
}

export const buildDailyCudyrSummary = (record: DailyRecord): CudyrDailySummary => {
    const patients = collectDailyCudyrPatients(record);

    const countsByType: Record<BedTypeKey, Record<CudyrCategoryCode, number>> = {
        UTI: createEmptyCategoryMap(),
        MEDIA: createEmptyCategoryMap()
    };
    const totalsByType: Record<BedTypeKey, number> = { UTI: 0, MEDIA: 0 };
    const totalsByCategory = createEmptyCategoryMap();

    let categorizedPatients = 0;

    patients.forEach(patient => {
        if (!patient.isCategorized) return;

        countsByType[patient.bedType][patient.category] += 1;
        totalsByType[patient.bedType] += 1;
        totalsByCategory[patient.category] += 1;
        categorizedPatients += 1;
    });

    return {
        date: record.date,
        occupiedPatients: patients.length,
        categorizedPatients,
        countsByType,
        totalsByType,
        totalsByCategory
    };
};

export interface CudyrMonthlyTotals {
    year: number;
    monthIndex: number;
    summaries: CudyrDailySummary[];
    countsByType: Record<BedTypeKey, Record<CudyrCategoryCode, number>>;
    totalsByType: Record<BedTypeKey, number>;
    totalsByCategory: Record<CudyrCategoryCode, number>;
    occupiedPatients: number;
    categorizedPatients: number;
}

export const aggregateMonthlySummaries = (
    summaries: CudyrDailySummary[],
    year: number,
    monthIndex: number
): CudyrMonthlyTotals => {
    const countsByType: Record<BedTypeKey, Record<CudyrCategoryCode, number>> = {
        UTI: createEmptyCategoryMap(),
        MEDIA: createEmptyCategoryMap()
    };
    const totalsByType: Record<BedTypeKey, number> = { UTI: 0, MEDIA: 0 };
    const totalsByCategory = createEmptyCategoryMap();

    let occupiedPatients = 0;
    let categorizedPatients = 0;

    summaries.forEach(summary => {
        occupiedPatients += summary.occupiedPatients;
        categorizedPatients += summary.categorizedPatients;

        (['UTI', 'MEDIA'] as BedTypeKey[]).forEach(type => {
            totalsByType[type] += summary.totalsByType[type];
            CATEGORY_CODES.forEach(code => {
                const count = summary.countsByType[type][code] || 0;
                countsByType[type][code] += count;
                totalsByCategory[code] += count;
            });
        });
    });

    return {
        year,
        monthIndex,
        summaries,
        countsByType,
        totalsByType,
        totalsByCategory,
        occupiedPatients,
        categorizedPatients
    };
};

export const getCudyrMonthlyTotals = async (year: number, monthIndex: number): Promise<CudyrMonthlyTotals> => {
    const monthNumber = monthIndex + 1;
    const records = await getRecordsForMonth(year, monthNumber);
    const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const summaries = sortedRecords.map(buildDailyCudyrSummary);

    return aggregateMonthlySummaries(summaries, year, monthIndex);
};

export type { ClassifiedCudyrPatient };
