import React from 'react';
import { CudyrSummary } from '../../services/calculations/cudyrSummary';

interface CudyrSummaryTableProps {
    summary: CudyrSummary;
}

/**
 * Compact summary table for CUDYR categories
 * Shows counts for A1-D3 separated by UTI and Media beds
 */
export const CudyrSummaryTable: React.FC<CudyrSummaryTableProps> = ({ summary }) => {
    // Rows: A, B, C, D
    const rows = ['A', 'B', 'C', 'D'];
    // Columns: 1, 2, 3
    const cols = ['1', '2', '3'];

    // Calculate totals for each bed type
    const utiTotal = Object.values(summary.uti).reduce((a, b) => a + b, 0);
    const mediaTotal = Object.values(summary.media).reduce((a, b) => a + b, 0);

    // Render a compact table for a specific bed type
    const renderTable = (type: 'uti' | 'media', title: string, bgClass: string, borderClass: string) => {
        const data = type === 'uti' ? summary.uti : summary.media;
        const total = type === 'uti' ? utiTotal : mediaTotal;

        return (
            <div className={`flex-1 ${bgClass} p-3 rounded-lg border ${borderClass}`}>
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{title}</h4>
                    <span className="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Total: {total}
                    </span>
                </div>
                <div className="space-y-1">
                    {rows.map(row => (
                        <div key={row} className="flex gap-2 text-[11px]">
                            {cols.map(col => {
                                const cat = `${row}${col}`;
                                const count = data[cat] || 0;
                                return (
                                    <span key={cat} className="bg-white px-2 py-0.5 rounded border border-slate-100 font-medium">
                                        {cat}= <strong>{count}</strong>
                                    </span>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 print:mb-2 print:p-2 print:rounded-none shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-700 mb-3 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-medical-500"></span>
                Resumen por Categoría y Tipo de Cama
            </h3>

            <div className="flex gap-4 print:gap-2">
                {renderTable('uti', 'UTI / Críticos', 'bg-blue-50/60', 'border-blue-200')}
                {renderTable('media', 'Medias / Básicos', 'bg-amber-50/60', 'border-amber-200')}
            </div>
        </div>
    );
};
