import React, { useMemo } from 'react';
import { useDailyRecordContext } from '../../context/DailyRecordContext';
import { BEDS } from '../../constants';
import { CudyrScore } from '../../types';
import { ClipboardList } from 'lucide-react';

// Sub-components
import { CudyrHeader } from './CudyrHeader';
import { CudyrRow, VerticalHeader } from './CudyrRow';
import { getCategorization } from './CudyrScoreUtils';
import { buildDailyCudyrSummary, CATEGORY_CODES } from '../../services/cudyr/cudyrReportService';

interface CudyrViewProps {
    readOnly?: boolean;
}

import { useAuditContext } from '../../context/AuditContext';
import { getAttributedAuthors } from '../../services/admin/attributionService';
import { useEffect } from 'react';

export const CudyrView: React.FC<CudyrViewProps> = ({ readOnly = false }) => {
    const { record, updateCudyr, updateClinicalCribCudyr } = useDailyRecordContext();
    const { logEvent } = useAuditContext();

    // MINSAL Traceability: Log when patient CUDYR is viewed
    const { userId } = useAuditContext();
    useEffect(() => {
        if (record && record.date) {
            // Attribution logic for shared accounts (MINSAL requirement)
            const authors = getAttributedAuthors(userId, record);

            logEvent(
                'VIEW_CUDYR',
                'dailyRecord',
                record.date,
                { view: 'cudyr' },
                undefined,
                record.date,
                authors
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [record?.date, userId]); // Only log when the date changes or user changes

    // Filter beds to display - MUST be called before any early return
    const visibleBeds = useMemo(() => {
        if (!record) return [];
        const activeExtras = record.activeExtraBeds || [];
        return BEDS.filter(b => !b.isExtra || activeExtras.includes(b.id));
    }, [record]);

    // Calculate statistics - MUST be called before any early return
    // Now includes clinical crib patients
    const stats = useMemo(() => {
        if (!record) return { occupiedCount: 0, categorizedCount: 0 };

        let occupiedCount = 0;
        let categorizedCount = 0;

        visibleBeds.forEach(b => {
            const p = record.beds[b.id];

            // Count main bed patient
            if (p.patientName && !p.isBlocked) {
                occupiedCount++;
                const { isCategorized } = getCategorization(p.cudyr);
                if (isCategorized) categorizedCount++;
            }

            // Count clinical crib patient (nested)
            if (p.clinicalCrib?.patientName) {
                occupiedCount++;
                const { isCategorized } = getCategorization(p.clinicalCrib.cudyr);
                if (isCategorized) categorizedCount++;
            }
        });

        return { occupiedCount, categorizedCount };
    }, [visibleBeds, record]);

    // Early return AFTER all hooks have been called
    if (!record) {
        return <div className="p-8 text-center text-slate-500">Seleccione una fecha con registros para ver el CUDYR.</div>;
    }

    // Handle score changes - routes to appropriate function based on isNested flag
    const handleScoreChange = (bedId: string, field: keyof CudyrScore, value: number, isNested?: boolean) => {
        if (isNested) {
            updateClinicalCribCudyr(bedId, field, value);
        } else {
            updateCudyr(bedId, field, value);
        }
    };

    // Format date for print header
    const formatPrintDate = () => {
        const [year, month, day] = record.date.split('-');
        return `${day}-${month}-${year}`;
    };

    // Get night shift nurses for print header (CUDYR is filled by night nurses)
    const responsibleNurses = (record.nursesNightShift || []).filter(n => n && n.trim() !== '');
    const dailySummary = useMemo(() => record ? buildDailyCudyrSummary(record) : null, [record]);

    return (
        <div className="space-y-6 animate-fade-in pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:space-y-2 print:pb-0 print:break-inside-avoid">
            {/* Print-only Header with Icon, Date, Nurses, and Stats */}
            <div className="hidden print:block mb-2 pb-2 border-b border-slate-300">
                <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                    <ClipboardList size={20} className="text-medical-600" />
                    Instrumento CUDYR
                </h1>
                <div className="flex items-center gap-4 text-sm text-slate-700">
                    <span className="font-semibold">Fecha: {formatPrintDate()}</span>
                    <span className="text-slate-400">|</span>
                    <span>
                        <span className="font-semibold">Enfermeros/as: </span>
                        {responsibleNurses.length > 0
                            ? responsibleNurses.join(', ')
                            : <span className="italic text-slate-400">No registrados</span>
                        }
                    </span>
                </div>
                {/* Statistics row */}
                <div className="flex items-center gap-4 text-xs text-slate-600 mt-1">
                    <span>Ocupadas: <strong>{stats.occupiedCount}</strong></span>
                    <span className="text-slate-400">|</span>
                    <span>Categorizados: <strong>{stats.categorizedCount}</strong></span>
                    <span className="text-slate-400">|</span>
                    <span>Índice: <strong>{stats.occupiedCount > 0 ? Math.round((stats.categorizedCount / stats.occupiedCount) * 100) : 0}%</strong></span>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none print:p-0 print:break-inside-avoid">
                {/* Hide CudyrHeader when printing - title already in print header */}
                <div className="print:hidden">
                    <CudyrHeader
                        occupiedCount={stats.occupiedCount}
                        categorizedCount={stats.categorizedCount}
                    />
                </div>

                <div className="overflow-x-auto print:overflow-visible">
                    {/* Daily categorized summary */}
                    {dailySummary && (
                        <div className="mb-3">
                            <h3 className="text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Resumen por categoría y tipo de cama</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] leading-tight">
                                {(['UTI', 'MEDIA'] as const).map(type => (
                                    <div key={type} className="border border-slate-200 rounded-md shadow-sm">
                                        <div className="px-2 py-1 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                                            {type === 'UTI' ? 'UTI (R1-R4)' : 'Camas medias'}
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-slate-50 text-slate-500 uppercase">
                                                        <th className="px-2 py-1 text-left font-semibold">Grupo</th>
                                                        <th className="px-2 py-1 text-center font-semibold">1</th>
                                                        <th className="px-2 py-1 text-center font-semibold">2</th>
                                                        <th className="px-2 py-1 text-center font-semibold">3</th>
                                                        <th className="px-2 py-1 text-right font-semibold">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(['A', 'B', 'C', 'D'] as const).map(group => {
                                                        const keys = [`${group}1`, `${group}2`, `${group}3`] as (typeof CATEGORY_CODES[number])[];
                                                        const rowTotal = keys.reduce((acc, key) => acc + dailySummary.countsByType[type][key], 0);
                                                        return (
                                                            <tr key={group} className="border-t border-slate-100">
                                                                <td className="px-2 py-1 font-semibold text-slate-700">{group}</td>
                                                                {keys.map(key => (
                                                                    <td key={key} className="px-1 py-1 text-center font-medium text-slate-700">
                                                                        {dailySummary.countsByType[type][key]}
                                                                    </td>
                                                                ))}
                                                                <td className="px-2 py-1 text-right font-semibold text-slate-800">{rowTotal}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t border-slate-200 bg-slate-50 text-slate-700 font-bold">
                                                        <td className="px-2 py-1">Total</td>
                                                        <td colSpan={3}></td>
                                                        <td className="px-2 py-1 text-right">{dailySummary.totalsByType[type]}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <table className="w-full text-left text-xs border-collapse border border-slate-300 min-w-[900px] print:table-auto print:min-w-0 print:text-[7px]">
                        <thead>
                            {/* Group Headers */}
                            <tr>
                                <th colSpan={2} className="bg-slate-100 border border-slate-300 p-2 text-center font-bold text-slate-700 print:bg-white print:p-1">PACIENTE</th>
                                <th colSpan={6} className="bg-blue-50 border border-blue-200 p-2 text-center font-bold text-blue-800 print:bg-white print:text-black print:border-slate-300 print:p-1">PUNTOS DEPENDENCIA (0-3)</th>
                                <th colSpan={8} className="bg-red-50 border border-red-200 p-2 text-center font-bold text-red-800 print:bg-white print:text-black print:border-slate-300 print:p-1">PUNTOS DE RIESGO (0-3)</th>
                                {/* RESULTADOS: colspan 3 on screen, only shows CAT on print */}
                                <th colSpan={3} className="bg-slate-100 border border-slate-300 p-2 text-center font-bold text-slate-700 print:hidden">RESULTADOS</th>
                                <th className="bg-slate-100 border border-slate-300 p-2 text-center font-bold text-slate-700 hidden print:table-cell print:bg-white print:p-1">CAT</th>
                            </tr>
                            {/* Column Headers */}
                            <tr className="text-center">
                                {/* Fixed */}
                                <th className="border border-slate-300 p-1 w-10 bg-slate-50 align-middle print:w-auto">CAMA</th>
                                <th className="border border-slate-300 p-1 w-[100px] max-w-[100px] bg-slate-50 align-middle print:w-[88px] print:max-w-[88px]">
                                    <span className="print:hidden">NOMBRE</span>
                                    <span className="hidden print:inline">RUT</span>
                                </th>

                                {/* Dep - Vertical */}
                                <VerticalHeader text="Cuidados Cambio Ropa" colorClass="bg-blue-50/50" />
                                <VerticalHeader text="Cuidados de Movilización" colorClass="bg-blue-50/50" />
                                <VerticalHeader text="Cuidados de Alimentación" colorClass="bg-blue-50/50" />
                                <VerticalHeader text="Cuidados de Eliminación" colorClass="bg-blue-50/50" />
                                <VerticalHeader text="Apoyo Psicosocial y Emocional" colorClass="bg-blue-50/50" />
                                <VerticalHeader text="Vigilancia" colorClass="bg-blue-50/50" />

                                {/* Risk - Vertical */}
                                <VerticalHeader text="Medicición Signos Vitales" colorClass="bg-red-50/50" />
                                <VerticalHeader text="Balance Hìdrico" colorClass="bg-red-50/50" />
                                <VerticalHeader text="Cuidados de Oxigenoterapia" colorClass="bg-red-50/50" />
                                <VerticalHeader text="Cuidados diarios de Vía Aérea" colorClass="bg-red-50/50" />
                                <VerticalHeader text="Intervenciones Profesionales" colorClass="bg-red-50/50" />
                                <VerticalHeader text="Cuidados de la Piel y Curaciones" colorClass="bg-red-50/50" />
                                <VerticalHeader text="Administración Tto Farmacológico" colorClass="bg-red-50/50" />
                                <VerticalHeader text="Presencia Elem. Invasivos" colorClass="bg-red-50/50" />

                                {/* Results - P.DEP and P.RIES first (hidden on print), then CAT */}
                                <th className="border border-slate-300 p-1 w-12 bg-slate-50 text-blue-800 align-middle print:hidden">P.DEP</th>
                                <th className="border border-slate-300 p-1 w-12 bg-slate-50 text-red-800 align-middle print:hidden">P.RIES</th>
                                <th className="border border-slate-300 p-1 w-14 bg-slate-50 align-middle print:w-auto print:p-0.5 print:bg-white">CAT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleBeds.map(bed => {
                                const patient = record.beds[bed.id];
                                const hasClinicalCrib = patient.clinicalCrib?.patientName;

                                return (
                                    <React.Fragment key={bed.id}>
                                        {/* Main bed row */}
                                        <CudyrRow
                                            bed={bed}
                                            patient={patient}
                                            onScoreChange={handleScoreChange}
                                            readOnly={readOnly}
                                        />
                                        {/* Clinical crib row (if exists and has patient) */}
                                        {hasClinicalCrib && (
                                            <CudyrRow
                                                bed={bed}
                                                patient={patient.clinicalCrib!}
                                                onScoreChange={handleScoreChange}
                                                readOnly={readOnly}
                                                isNested={true}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
