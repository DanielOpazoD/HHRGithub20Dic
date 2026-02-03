import { DailyRecord, PatientData, BedType } from '../../types';
import { getCategorization } from '../../views/cudyr/CudyrScoreUtils';
import { BEDS } from '../../constants';
import { getBedTypeForRecord, isIntensiveBedType } from '../../utils';
import { getAllRecords } from '../storage/indexedDBService';

/**
 * Interface for CUDYR Summary counts
 */
export interface CudyrSummary {
    uti: Record<string, number>;
    media: Record<string, number>;
    total: Record<string, number>;
}

export const CATEGORIES = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3'];

/**
 * Creates an empty summary structure
 */
export const createEmptySummary = (): CudyrSummary => {
    const uti: Record<string, number> = {};
    const media: Record<string, number> = {};
    const total: Record<string, number> = {};

    CATEGORIES.forEach(cat => {
        uti[cat] = 0;
        media[cat] = 0;
        total[cat] = 0;
    });

    return { uti, media, total };
};

/**
 * Collect all categorized patients from a record, including clinical cribs
 */
export const collectDailyCudyrPatients = (record: DailyRecord): { patient: PatientData; bedType: BedType }[] => {
    const activeExtras = record.activeExtraBeds || [];
    const visibleBeds = BEDS.filter(b => !b.isExtra || activeExtras.includes(b.id));

    const results: { patient: PatientData; bedType: BedType }[] = [];

    visibleBeds.forEach(bed => {
        const p = record.beds[bed.id];
        if (!p || p.isBlocked) return;

        // Main patient
        if (p.patientName) {
            const { isCategorized } = getCategorization(p.cudyr);
            if (isCategorized) {
                results.push({ patient: p, bedType: getBedTypeForRecord(bed, record) });
            }
        }

        // Nested clinical crib
        if (p.clinicalCrib?.patientName) {
            const { isCategorized } = getCategorization(p.clinicalCrib.cudyr);
            if (isCategorized) {
                // Nested patients in this system are typically considered "Cuna" but 
                // for CUDYR categorization totals, they follow the room/bed type? 
                // Usually clinical cribs are in NEO (Media) or with mother (Media).
                // We'll use the bed type they are in.
                results.push({ patient: p.clinicalCrib, bedType: getBedTypeForRecord(bed, record) });
            }
        }
    });

    return results;
};

/**
 * Build a summary for a single day
 */
export const buildDailyCudyrSummary = (record: DailyRecord): CudyrSummary & { occupiedCount: number; categorizedCount: number } => {
    const summary = createEmptySummary();
    const activeExtras = record.activeExtraBeds || [];
    const visibleBeds = BEDS.filter(b => !b.isExtra || activeExtras.includes(b.id));

    let occupiedCount = 0;
    let categorizedCount = 0;

    visibleBeds.forEach(bed => {
        const p = record.beds[bed.id];
        if (!p || p.isBlocked) return;

        // Main patient
        if (p.patientName) {
            occupiedCount++;
            const { isCategorized, finalCat } = getCategorization(p.cudyr);
            if (isCategorized) {
                categorizedCount++;
                if (CATEGORIES.includes(finalCat)) {
                    if (isIntensiveBedType(getBedTypeForRecord(bed, record))) {
                        summary.uti[finalCat]++;
                    } else {
                        summary.media[finalCat]++;
                    }
                    summary.total[finalCat]++;
                }
            }
        }

        // Nested clinical crib
        if (p.clinicalCrib?.patientName) {
            occupiedCount++;
            const { isCategorized, finalCat } = getCategorization(p.clinicalCrib.cudyr);
            if (isCategorized) {
                categorizedCount++;
                if (CATEGORIES.includes(finalCat)) {
                    if (isIntensiveBedType(getBedTypeForRecord(bed, record))) {
                        summary.uti[finalCat]++;
                    } else {
                        summary.media[finalCat]++;
                    }
                    summary.total[finalCat]++;
                }
            }
        }
    });

    return { ...summary, occupiedCount, categorizedCount };
};

/**
 * Extended summary with occupancy data
 */
export interface DailySummaryWithOccupancy extends CudyrSummary {
    occupiedCount: number;
    categorizedCount: number;
}

/**
 * Get monthly totals for CUDYR
 */
export const getCudyrMonthlyTotals = async (year: number, month: number, endDate?: string) => {
    const allRecords = await getAllRecords();
    const monthStr = String(month + 1).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;

    const dailySummaries: Record<string, DailySummaryWithOccupancy> = {};
    const monthlyTotal = createEmptySummary();
    let totalOccupied = 0;
    let totalCategorized = 0;

    // Filter and sort relevant dates
    const dates = Object.keys(allRecords)
        .filter(date => date.startsWith(prefix) && (!endDate || date <= endDate))
        .sort();

    dates.forEach(date => {
        const record = allRecords[date];
        const daySummary = buildDailyCudyrSummary(record);
        dailySummaries[date] = daySummary;

        // Accumulate monthly totals
        CATEGORIES.forEach(cat => {
            monthlyTotal.uti[cat] += daySummary.uti[cat];
            monthlyTotal.media[cat] += daySummary.media[cat];
            monthlyTotal.total[cat] += daySummary.total[cat];
        });

        totalOccupied += daySummary.occupiedCount;
        totalCategorized += daySummary.categorizedCount;
    });

    return {
        dailySummaries,
        monthlyTotal,
        dates,
        totalOccupied,
        totalCategorized
    };
};
