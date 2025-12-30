import React from 'react';
import { Copy, Move } from 'lucide-react';
import clsx from 'clsx';
import { BEDS } from '../../../constants';
import { useDailyRecordContext } from '../../../context/DailyRecordContext';
import { BaseModal } from '../../shared/BaseModal';

export interface MoveCopyModalProps {
    isOpen: boolean;
    type: 'move' | 'copy' | null;
    sourceBedId: string | null;
    targetBedId: string | null;
    onClose: () => void;
    onSetTarget: (id: string) => void;
    onConfirm: () => void;
}

export const MoveCopyModal: React.FC<MoveCopyModalProps> = ({
    isOpen, type, sourceBedId, targetBedId, onClose, onSetTarget, onConfirm
}) => {
    const { record } = useDailyRecordContext();

    if (!type || !record) return null;

    // Only show standard beds or active extra beds
    const visibleBeds = BEDS.filter(b => !b.isExtra || (record.activeExtraBeds || []).includes(b.id));
    const sourceBedName = BEDS.find(b => b.id === sourceBedId)?.name || '';

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={type === 'move' ? 'Mover Paciente' : 'Copiar Datos'}
            icon={type === 'move' ? <Move size={18} /> : <Copy size={18} />}
            size="lg" // Larger width for more columns
            headerIconColor="text-medical-600"
            variant="white"
        >
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        Destino del {type === 'move' ? 'Movimiento' : 'Copiado'}
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2 ml-1">
                        Desde <span className="font-bold text-slate-700">{sourceBedName}</span> hacia:
                    </p>

                    <div className="grid grid-cols-3 gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
                        {visibleBeds.filter(b => b.id !== sourceBedId).map(bed => {
                            const isOccupied = !!record.beds[bed.id].patientName;
                            const isSelected = targetBedId === bed.id;

                            return (
                                <button
                                    key={bed.id}
                                    onClick={() => onSetTarget(bed.id)}
                                    className={clsx(
                                        "p-2 rounded-lg border text-left transition-all h-[52px] flex flex-col justify-between",
                                        isSelected
                                            ? "bg-medical-50 border-medical-500 ring-1 ring-medical-500 shadow-sm"
                                            : "bg-slate-50 border-slate-200 hover:border-medical-300 hover:bg-white"
                                    )}
                                >
                                    <div className="flex justify-between items-center">
                                        <p className={clsx("font-bold text-[11px] truncate", isSelected ? "text-medical-800" : "text-slate-700")}>
                                            {bed.name}
                                        </p>
                                        <div className={clsx(
                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                            isOccupied ? "bg-amber-400" : "bg-emerald-400"
                                        )} />
                                    </div>
                                    <p className={clsx(
                                        "text-[8px] uppercase tracking-wider font-semibold",
                                        isSelected ? "text-medical-600" : "text-slate-400"
                                    )}>
                                        {isOccupied ? 'Ocupada' : 'Libre'}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Actions - Standard Clean Style */}
                <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-50">
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 text-xs font-semibold transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled={!targetBedId}
                        onClick={onConfirm}
                        className="px-5 py-2 bg-medical-600 text-white rounded-lg text-xs font-bold shadow-md shadow-medical-600/10 hover:bg-medical-700 transition-all transform active:scale-95 disabled:opacity-50 disabled:transform-none"
                    >
                        Confirmar {type === 'move' ? 'Traslado' : 'Copia'}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
