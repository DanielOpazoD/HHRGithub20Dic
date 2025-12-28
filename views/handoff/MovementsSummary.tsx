/**
 * MovementsSummary Component
 * 
 * Displays summary tables for discharges (Altas), transfers (Traslados),
 * and CMA (day hospitalization) patients in the nursing handoff view.
 */

import React from 'react';
import { UserMinus, ArrowRightLeft, Sun } from 'lucide-react';
import type { DailyRecord } from '@/types';

interface MovementsSummaryProps {
    record: DailyRecord;
}

export const MovementsSummary: React.FC<MovementsSummaryProps> = ({ record }) => {
    return (
        <div className="space-y-4 print:space-y-2 print:text-[11px] print:leading-tight">
            {/* Discharges - Simplified Read-Only */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 print:p-0 print:shadow-none print:border-none print:bg-transparent">
                <h3 className="font-bold text-lg text-slate-700 mb-2 flex items-center gap-2 print:text-sm print:mb-1 print:text-black">
                    <UserMinus size={20} className="text-red-500 print:w-4 print:h-4" />
                    Altas
                </h3>
                {(!record.discharges || record.discharges.length === 0) ? (
                    <p className="text-slate-400 italic text-sm print:text-[10px]">No hay altas registradas hoy.</p>
                ) : (
                    <table className="w-full text-left text-sm print:text-[10px] border-collapse print:[&_th]:p-1 print:[&_td]:p-1">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
                                <th className="p-2 border-r border-slate-200 w-20">Cama</th>
                                <th className="p-2 border-r border-slate-200">Paciente/RUT</th>
                                <th className="p-2 border-r border-slate-200">Diagnóstico</th>
                                <th className="p-2 border-r border-slate-200">Tipo Alta</th>
                                <th className="p-2 w-24">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {record.discharges.map(d => (
                                <tr key={d.id} className="border-b border-slate-100 print:border-slate-300 print:text-[10px]">
                                    <td className="p-2 border-r border-slate-200">{d.bedName}</td>
                                    <td className="p-2 border-r border-slate-200">
                                        <div className="font-medium print:text-[10px]">{d.patientName}</div>
                                        <div className="text-xs text-slate-500 font-mono print:text-[9px]">{d.rut}</div>
                                    </td>
                                    <td className="p-2 border-r border-slate-200">{d.diagnosis}</td>
                                    <td className="p-2 border-r border-slate-200">{d.dischargeType}</td>
                                    <td className="p-2">{d.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Transfers - Simplified Read-Only */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 print:p-0 print:shadow-none print:border-none print:bg-transparent">
                <h3 className="font-bold text-lg text-slate-700 mb-2 flex items-center gap-2 print:text-sm print:mb-1 print:text-black">
                    <ArrowRightLeft size={20} className="text-blue-500 print:w-4 print:h-4" />
                    Traslados
                </h3>
                {(!record.transfers || record.transfers.length === 0) ? (
                    <p className="text-slate-400 italic text-sm print:text-[10px]">No hay traslados registrados hoy.</p>
                ) : (
                    <table className="w-full text-left text-sm print:text-[10px] border-collapse print:[&_th]:p-1 print:[&_td]:p-1">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
                                <th className="p-2 border-r border-slate-200 w-24">Cama Origen</th>
                                <th className="p-2 border-r border-slate-200">Paciente</th>
                                <th className="p-2 w-48">Destino</th>
                            </tr>
                        </thead>
                        <tbody>
                            {record.transfers.map(t => (
                                <tr key={t.id} className="border-b border-slate-100 print:border-slate-300 print:text-[10px]">
                                    <td className="p-2 border-r border-slate-200">{t.bedName}</td>
                                    <td className="p-2 border-r border-slate-200">{t.patientName}</td>
                                    <td className="p-2">{t.receivingCenter === 'Otro' ? t.receivingCenterOther : t.receivingCenter}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* CMA - Simplified Read-Only */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 print:p-0 print:shadow-none print:border-none print:bg-transparent">
                <h3 className="font-bold text-lg text-slate-700 mb-2 flex items-center gap-2 print:text-sm print:mb-1 print:text-black">
                    <Sun size={20} className="text-orange-500 print:w-4 print:h-4" />
                    Hospitalización Diurna / CMA
                </h3>
                {(!record.cma || record.cma.length === 0) ? (
                    <p className="text-slate-400 italic text-sm print:text-[10px]">No hay pacientes de CMA hoy.</p>
                ) : (
                    <table className="w-full text-left text-sm print:text-[10px] border-collapse print:[&_th]:p-1 print:[&_td]:p-1">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
                                <th className="p-2 border-r border-slate-200 w-20">Cama</th>
                                <th className="p-2 border-r border-slate-200">Paciente</th>
                                <th className="p-2 border-r border-slate-200">Diagnóstico</th>
                                <th className="p-2 w-24">Hora</th>
                            </tr>
                        </thead>
                        <tbody>
                            {record.cma.map(c => (
                                <tr key={c.id} className="border-b border-slate-100 print:border-slate-300 print:text-[10px]">
                                    <td className="p-2 border-r border-slate-200">{c.bedName}</td>
                                    <td className="p-2 border-r border-slate-200">{c.patientName}</td>
                                    <td className="p-2 border-r border-slate-200">{c.diagnosis}</td>
                                    <td className="p-2">
                                        {c.timestamp ? new Date(c.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default MovementsSummary;
