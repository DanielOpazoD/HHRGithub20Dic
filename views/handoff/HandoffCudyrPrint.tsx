import React, { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import { useDailyRecordContext } from '@/context/DailyRecordContext';
import { BEDS } from '@/constants';
import { getCategorization } from '@/views/cudyr/CudyrScoreUtils';

export const HandoffCudyrPrint: React.FC = () => {
    const { record } = useDailyRecordContext();

    const visibleBeds = useMemo(() => {
        if (!record) return [];
        const activeExtras = record.activeExtraBeds || [];
        return BEDS.filter((b) => !b.isExtra || activeExtras.includes(b.id));
    }, [record]);

    if (!record) return null;

    const formatPrintDate = () => {
        const [year, month, day] = record.date.split('-');
        return `${day}-${month}-${year}`;
    };

    const responsibleNurses = (record.nursesNightShift || []).filter((n) => n && n.trim() !== '');

    const renderScore = (value?: number) => {
        if (value === 0) return 0;
        if (value === undefined || value === null) return '-';
        return value;
    };

    return (
        <div className="handoff-cudyr-print">
            <div className="mb-3 pb-3 border-b border-slate-300">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                    <ClipboardList size={18} className="text-medical-700" />
                    Instrumento CUDYR
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                    <span className="font-semibold">Fecha: {formatPrintDate()}</span>
                    <span className="text-slate-400">|</span>
                    <span>
                        <span className="font-semibold">Enfermeros: </span>
                        {responsibleNurses.length > 0 ? (
                            responsibleNurses.join(', ')
                        ) : (
                            <span className="italic text-slate-400">No registrados</span>
                        )}
                    </span>
                </div>
            </div>

            <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                        <tr className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                            <th className="border border-slate-300 p-1 w-12 text-center">Cama</th>
                            <th className="border border-slate-300 p-1 w-40">Paciente</th>
                            <th className="border border-slate-300 p-1 text-center" colSpan={6}>Dependencia (0-3)</th>
                            <th className="border border-slate-300 p-1 text-center" colSpan={8}>Riesgo (0-3)</th>
                            <th className="border border-slate-300 p-1 text-center w-12">CAT</th>
                        </tr>
                        <tr className="bg-slate-50 text-[10px] text-center">
                            <th className="border border-slate-300 p-1">&nbsp;</th>
                            <th className="border border-slate-300 p-1">RUT</th>
                            <th className="border border-slate-300 p-1">Ropa</th>
                            <th className="border border-slate-300 p-1">Mov.</th>
                            <th className="border border-slate-300 p-1">Alim.</th>
                            <th className="border border-slate-300 p-1">Elim.</th>
                            <th className="border border-slate-300 p-1">Psico</th>
                            <th className="border border-slate-300 p-1">Vig.</th>
                            <th className="border border-slate-300 p-1">Signos</th>
                            <th className="border border-slate-300 p-1">Balance</th>
                            <th className="border border-slate-300 p-1">Oxígeno</th>
                            <th className="border border-slate-300 p-1">Vía Aérea</th>
                            <th className="border border-slate-300 p-1">Interv.</th>
                            <th className="border border-slate-300 p-1">Piel</th>
                            <th className="border border-slate-300 p-1">Fármacos</th>
                            <th className="border border-slate-300 p-1">Invasivos</th>
                            <th className="border border-slate-300 p-1">Cat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleBeds.map((bed) => {
                            const patient = record.beds[bed.id];
                            const cudyr = patient.cudyr || {};
                            const { finalCat } = getCategorization(cudyr);

                            if (!patient.patientName) {
                                return (
                                    <tr key={bed.id} className="text-slate-500 text-[10px]">
                                        <td className="border border-slate-300 p-1 text-center font-semibold">{bed.name}</td>
                                        <td className="border border-slate-300 p-1 text-center italic" colSpan={15}>
                                            Cama disponible
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center font-semibold">-</td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={bed.id} className="text-slate-800">
                                    <td className="border border-slate-300 p-1 text-center font-semibold">{bed.name}</td>
                                    <td className="border border-slate-300 p-1 text-[10px]">
                                        <div className="font-semibold">{patient.patientName}</div>
                                        <div className="text-slate-500 font-mono">{patient.rut || '-'}</div>
                                    </td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.changeClothes)}</td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.mobilization)}</td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.feeding)}</td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.elimination)}</td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.psychosocial)}</td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.surveillance)}</td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.vitalSigns)}</td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.fluidBalance)}</td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.oxygenTherapy)}</td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.airway)}</td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.proInterventions)}</td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.skinCare)}</td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.pharmacology)}</td>
                                    <td className="border border-slate-300 p-1 text-center">{renderScore(cudyr.invasiveElements)}</td>
                                    <td className="border border-slate-300 p-1 text-center font-bold">{finalCat}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
