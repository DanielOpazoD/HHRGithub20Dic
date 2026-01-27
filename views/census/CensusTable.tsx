import React, { useMemo, useCallback, useState } from 'react';
import { DailyRecord } from '../../types';
import { BEDS } from '../../constants';
import { PatientRow } from '../../components/census/PatientRow';
import { useCensusActions } from './CensusActionsContext';
import { useConfirmDialog } from '../../context/UIContext';
import { useTableConfig, TableColumnConfig } from '../../context/TableConfigContext';
import { ResizableHeader } from '../../components/ui/ResizableHeader';
import { Trash2, Baby, Settings2 } from 'lucide-react';
import clsx from 'clsx';

interface CensusTableProps {
    record: DailyRecord;
    currentDateString: string;
    onResetDay: () => void;
    readOnly?: boolean;
}

export const CensusTable: React.FC<CensusTableProps> = ({
    record,
    currentDateString,
    onResetDay,
    readOnly = false
}) => {
    const { showCribConfig, setShowCribConfig, handleRowAction } = useCensusActions();
    const { confirm } = useConfirmDialog();
    const { config, isEditMode, setEditMode, updateColumnWidth } = useTableConfig();
    const { columns } = config;
    const [bedFilter, setBedFilter] = useState<'ALL' | 'HOSPITALIZED' | 'POLICLINICO' | 'SHIFT' | 'EXTRA'>('ALL');

    // Filter beds to display: All normal beds + Enabled extra beds
    const visibleBeds = useMemo(() => {
        const activeExtras = record.activeExtraBeds || [];
        return BEDS.filter(b => !b.isExtra || activeExtras.includes(b.id));
    }, [record.activeExtraBeds]);

    const filteredBeds = useMemo(() => {
        return visibleBeds.filter((bed) => {
            const patient = record.beds[bed.id];
            const hasPatient = !!patient.patientName && !patient.isBlocked;
            const isExtra = !!bed.isExtra;
            const isTodayAdmission = !!patient.admissionDate && patient.admissionDate === currentDateString;
            const isPoliclinico = ['CAE', 'APS'].includes(patient.admissionOrigin || '');

            switch (bedFilter) {
                case 'HOSPITALIZED':
                    return hasPatient;
                case 'POLICLINICO':
                    return hasPatient && isPoliclinico;
                case 'SHIFT':
                    return hasPatient && isTodayAdmission;
                case 'EXTRA':
                    return isExtra;
                default:
                    return true;
            }
        });
    }, [visibleBeds, record.beds, bedFilter, currentDateString]);

    const handleClearAll = useCallback(async () => {
        const confirmed = await confirm({
            title: '⚠️ Reiniciar registro del día',
            message: '¿Está seguro de que desea ELIMINAR todos los datos del día?\n\nEsto eliminará el registro completo y podrá crear uno nuevo (copiar del anterior o en blanco).',
            confirmText: 'Sí, reiniciar',
            cancelText: 'Cancelar',
            variant: 'danger'
        });

        if (confirmed) {
            onResetDay();
        }
    }, [confirm, onResetDay]);

    const handleColumnResize = useCallback((column: keyof TableColumnConfig) => (width: number) => {
        updateColumnWidth(column, width);
    }, [updateColumnWidth]);

    // Common header classes
    const headerClass = "sticky top-0 z-20 bg-white py-1 px-1 border-r border-slate-100 text-center text-slate-500 text-[10px] uppercase tracking-wider font-bold shadow-[0_1px_0_0_rgba(15,23,42,0.04)]";

    return (
        <div className="card print:border-none print:shadow-none flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Agenda diaria</span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                        Pacientes
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Ver</span>
                    <div className="relative">
                        <select
                            value={bedFilter}
                            onChange={(e) => setBedFilter(e.target.value as typeof bedFilter)}
                            className="appearance-none bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg pl-3 pr-7 py-1.5 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-400 transition"
                        >
                            <option value="ALL">Todos</option>
                            <option value="HOSPITALIZED">Hospitalizados</option>
                            <option value="POLICLINICO">Policlínico</option>
                            <option value="SHIFT">Turno</option>
                            <option value="EXTRA">Extra</option>
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
                            ▾
                        </span>
                    </div>
                </div>
            </div>
            <div className="relative overflow-x-auto">
                <table className="w-full text-left border-collapse print:text-xs relative text-[12px] leading-tight table-fixed">
                    <thead>
                        <tr className="border-b border-slate-200 print:static">
                            {/* Action column - resizable */}
                            <ResizableHeader
                                width={columns.actions}
                                isEditMode={isEditMode}
                                onResize={handleColumnResize('actions')}
                                className={clsx(headerClass, "print:hidden")}
                            >
                                <button
                                    onClick={handleClearAll}
                                    className="p-1 rounded-md bg-slate-500/20 hover:bg-slate-500/40 text-slate-400 hover:text-slate-600 transition-all mx-auto block"
                                    title="Limpiar todos los datos del día"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </ResizableHeader>

                            {/* Bed column */}
                            <ResizableHeader
                                width={columns.bed}
                                isEditMode={isEditMode}
                                onResize={handleColumnResize('bed')}
                                className={headerClass}
                            >
                                <div className="flex flex-col items-center gap-0.5">
                                    <span>Cama</span>
                                    {!readOnly && (
                                        <button
                                            onClick={() => setShowCribConfig(!showCribConfig)}
                                            className={clsx(
                                                "text-[10px] flex items-center justify-center p-0.5 rounded transition-all print:hidden w-5 h-5",
                                                showCribConfig ? "bg-medical-600 text-white" : "bg-white border border-slate-300 text-slate-400 hover:text-medical-600"
                                            )}
                                            title="Configurar Cunas"
                                        >
                                            <Baby size={12} />
                                        </button>
                                    )}
                                </div>
                            </ResizableHeader>

                            {/* Type column */}
                            <ResizableHeader
                                width={columns.type}
                                isEditMode={isEditMode}
                                onResize={handleColumnResize('type')}
                                className={headerClass}
                            >
                                Tipo
                            </ResizableHeader>

                            {/* Name column */}
                            <ResizableHeader
                                width={columns.name}
                                isEditMode={isEditMode}
                                onResize={handleColumnResize('name')}
                                className={headerClass}
                            >
                                Nombre Paciente
                            </ResizableHeader>

                            {/* RUT column */}
                            <ResizableHeader
                                width={columns.rut}
                                isEditMode={isEditMode}
                                onResize={handleColumnResize('rut')}
                                className={headerClass}
                            >
                                RUT
                            </ResizableHeader>

                            {/* Age column */}
                            <ResizableHeader
                                width={columns.age}
                                isEditMode={isEditMode}
                                onResize={handleColumnResize('age')}
                                className={headerClass}
                            >
                                Edad
                            </ResizableHeader>

                            {/* Diagnosis column */}
                            <ResizableHeader
                                width={columns.diagnosis}
                                isEditMode={isEditMode}
                                onResize={handleColumnResize('diagnosis')}
                                className={headerClass}
                            >
                                Diagnóstico
                            </ResizableHeader>

                            {/* Specialty column */}
                            <ResizableHeader
                                width={columns.specialty}
                                isEditMode={isEditMode}
                                onResize={handleColumnResize('specialty')}
                                className={headerClass}
                            >
                                Esp
                            </ResizableHeader>

                            {/* Status column */}
                            <ResizableHeader
                                width={columns.status}
                                isEditMode={isEditMode}
                                onResize={handleColumnResize('status')}
                                className={headerClass}
                            >
                                Estado
                            </ResizableHeader>

                            {/* Admission column */}
                            <ResizableHeader
                                width={columns.admission}
                                isEditMode={isEditMode}
                                onResize={handleColumnResize('admission')}
                                className={headerClass}
                            >
                                Ingreso
                            </ResizableHeader>

                            {/* DMI column */}
                            <ResizableHeader
                                width={columns.dmi}
                                isEditMode={isEditMode}
                                onResize={handleColumnResize('dmi')}
                                className={headerClass}
                                title="Dispositivos médicos invasivos"
                            >
                                DMI
                            </ResizableHeader>

                            {/* C.QX column */}
                            <ResizableHeader
                                width={columns.cqx}
                                isEditMode={isEditMode}
                                onResize={handleColumnResize('cqx')}
                                className={headerClass}
                                title="Comp. Quirurgica"
                            >
                                C.QX
                            </ResizableHeader>

                            {/* UPC column */}
                            <ResizableHeader
                                width={columns.upc}
                                isEditMode={isEditMode}
                                onResize={handleColumnResize('upc')}
                                className={clsx(headerClass, "border-r-0")}
                            >
                                UPC
                            </ResizableHeader>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredBeds.map((bed, index) => (
                            <PatientRow
                                key={bed.id}
                                bed={bed}
                                data={record.beds[bed.id]}
                                currentDateString={currentDateString}
                                onAction={handleRowAction}
                                showCribControls={showCribConfig}
                                readOnly={readOnly}
                                actionMenuAlign={index >= filteredBeds.length - 4 ? 'bottom' : 'top'}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
