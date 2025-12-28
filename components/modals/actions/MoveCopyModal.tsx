import React from 'react';
import { Copy, Move, ClipboardCheck } from 'lucide-react';
import clsx from 'clsx';
import { BEDS } from '../../../constants';
import { useDailyRecordContext } from '../../../context/DailyRecordContext';
import { BaseModal, ModalSection } from '../../shared/BaseModal';

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
            size="md"
            headerIconColor="text-medical-600"
        >
            <div className="space-y-6">
                <ModalSection
                    title="Seleccionar Destino"
                    icon={<ClipboardCheck size={14} />}
                    description={`${type === 'move' ? 'Mover' : 'Copiar'} desde ${sourceBedName} hacia:`}
                >
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                        {visibleBeds.filter(b => b.id !== sourceBedId).map(bed => (
                            <button
                                key={bed.id}
                                onClick={() => onSetTarget(bed.id)}
                                className={clsx(
                                    "p-3 rounded-xl border text-sm text-left transition-all shadow-sm",
                                    targetBedId === bed.id
                                        ? "bg-medical-600 text-white border-medical-600 shadow-medical-600/20"
                                        : "bg-white/60 border-white/60 text-slate-700 hover:bg-white/80 hover:border-medical-200"
                                )}
                            >
                                <p className="font-bold">{bed.name}</p>
                                <p className={clsx(
                                    "text-[10px] uppercase tracking-wider mt-0.5",
                                    targetBedId === bed.id ? "text-medical-100" : "text-slate-400"
                                )}>
                                    {record.beds[bed.id].patientName ? 'Ocupada' : 'Libre'}
                                </p>
                            </button>
                        ))}
                    </div>
                </ModalSection>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-white/20 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-500 hover:bg-white/40 rounded-xl text-sm font-semibold transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled={!targetBedId}
                        onClick={onConfirm}
                        className="px-6 py-2 bg-medical-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-medical-600/20 hover:bg-medical-700 hover:shadow-medical-600/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
