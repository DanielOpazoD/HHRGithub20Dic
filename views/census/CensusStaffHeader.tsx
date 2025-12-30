import React from 'react';
import clsx from 'clsx';
import { DailyRecord, Statistics } from '../../types';
import { NurseSelector, TensSelector } from './';
import { BedSummaryCard, CribSummaryCard, MovementSummaryCard } from '../../components/layout/SummaryCard';

interface CensusStaffHeaderProps {
    record: DailyRecord;
    nursesList: string[];
    tensList: string[];
    onUpdateNurse: (shift: 'day' | 'night', index: number, value: string) => void;
    onUpdateTens: (shift: 'day' | 'night', index: number, value: string) => void;
    readOnly?: boolean;
    stats: Statistics;
}

export const CensusStaffHeader: React.FC<CensusStaffHeaderProps> = ({
    record,
    nursesList,
    tensList,
    onUpdateNurse,
    onUpdateTens,
    readOnly = false,
    stats
}) => {
    // Safe arrays with defaults
    const safeNursesDayShift = record.nursesDayShift || [];
    const safeNursesNightShift = record.nursesNightShift || [];
    const safeTensDayShift = record.tensDayShift || [];
    const safeTensNightShift = record.tensNightShift || [];

    return (
        <div className="flex justify-center items-stretch gap-3 flex-wrap animate-fade-in px-4">
            {/* Staff Selectors */}
            <div className={clsx("flex gap-3 flex-wrap", readOnly && "pointer-events-none opacity-80")}>
                <NurseSelector
                    nursesDayShift={safeNursesDayShift}
                    nursesNightShift={safeNursesNightShift}
                    nursesList={nursesList}
                    onUpdateNurse={onUpdateNurse}
                />
                <TensSelector
                    tensDayShift={safeTensDayShift}
                    tensNightShift={safeTensNightShift}
                    tensList={tensList}
                    onUpdateTens={onUpdateTens}
                />
            </div>

            {/* Stats Summary Cards - Separated for consistency */}
            {stats && (
                <>
                    <BedSummaryCard stats={stats} />
                    <CribSummaryCard stats={stats} />
                    <MovementSummaryCard
                        discharges={record.discharges || []}
                        transfers={record.transfers || []}
                        cmaCount={record.cma?.length || 0}
                    />
                </>
            )}
        </div>
    );
};
