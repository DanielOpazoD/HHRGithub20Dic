import React from 'react';
import { Baby, LogOut, Clock, UserCheck } from 'lucide-react';
import { getTimeRoundedToStep } from '../../../utils';
import { BaseModal, ModalSection } from '../../shared/BaseModal';
import { TimeSchema, ActionNoteSchema } from '../../../schemas/inputSchemas';
import clsx from 'clsx';

export interface DischargeModalProps {
    isOpen: boolean;
    isEditing: boolean;
    status: 'Vivo' | 'Fallecido';

    // New props for Mother + Baby
    hasClinicalCrib?: boolean;
    clinicalCribName?: string;
    clinicalCribStatus?: 'Vivo' | 'Fallecido';
    onClinicalCribStatusChange?: (s: 'Vivo' | 'Fallecido') => void;

    // Initial Data for Editing
    initialType?: string;
    initialOtherDetails?: string;
    initialTime?: string;

    onStatusChange: (s: 'Vivo' | 'Fallecido') => void;
    onClose: () => void;
    onConfirm: (data: { status: 'Vivo' | 'Fallecido', type?: string, typeOther?: string, time: string }) => void;
}

export const DischargeModal: React.FC<DischargeModalProps> = ({
    isOpen, isEditing, status, onStatusChange, onClose, onConfirm,
    hasClinicalCrib, clinicalCribName, clinicalCribStatus, onClinicalCribStatusChange,
    initialType, initialOtherDetails, initialTime
}) => {
    const [dischargeType, setDischargeType] = React.useState<'Domicilio (Habitual)' | 'Voluntaria' | 'Fuga' | 'Otra'>((initialType as any) || 'Domicilio (Habitual)');
    const [otherDetails, setOtherDetails] = React.useState(initialOtherDetails || '');
    const [dischargeTime, setDischargeTime] = React.useState('');
    const [errors, setErrors] = React.useState<{ time?: string, other?: string }>({});

    // Reset state when modal opens or initial props change
    React.useEffect(() => {
        if (isOpen) {
            setDischargeType((initialType as any) || 'Domicilio (Habitual)');
            setOtherDetails(initialOtherDetails || '');
            const nowTime = getTimeRoundedToStep();
            setDischargeTime(initialTime || nowTime);
        }
    }, [isOpen, initialType, initialOtherDetails, initialTime]);

    const handleConfirm = () => {
        const newErrors: { time?: string, other?: string } = {};

        // Validate Time
        const timeResult = TimeSchema.safeParse(dischargeTime);
        if (!timeResult.success) {
            newErrors.time = timeResult.error.issues[0].message;
        }

        // Validate Other Details if selected
        if (status === 'Vivo' && dischargeType === 'Otra') {
            const otherResult = ActionNoteSchema.safeParse(otherDetails);
            if (!otherResult.success) {
                newErrors.other = otherResult.error.issues[0].message;
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onConfirm({
            status,
            type: status === 'Vivo' ? dischargeType : undefined,
            typeOther: (status === 'Vivo' && dischargeType === 'Otra') ? otherDetails : undefined,
            time: dischargeTime
        });
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Alta Médica' : 'Confirmar Alta Médica'}
            icon={<LogOut size={16} />}
            size="md"
            headerIconColor="text-emerald-600"
            variant="white"
        >
            <div className="space-y-5">
                {/* Main Patient Section - Minimalist */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Estado Madre / Paciente</label>
                        <div className="flex gap-6 pl-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="radio" name="status" value="Vivo"
                                    checked={status === 'Vivo'}
                                    onChange={() => onStatusChange('Vivo')}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500/20"
                                />
                                <span className={clsx("text-sm transition-colors", status === 'Vivo' ? "font-bold text-slate-900" : "text-slate-500 group-hover:text-slate-700")}>Vivo</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="radio" name="status" value="Fallecido"
                                    checked={status === 'Fallecido'}
                                    onChange={() => onStatusChange('Fallecido')}
                                    className="w-4 h-4 text-red-600 focus:ring-red-500/20"
                                />
                                <span className={clsx("text-sm transition-colors", status === 'Fallecido' ? "font-bold text-slate-900" : "text-slate-500 group-hover:text-slate-700")}>Fallecido</span>
                            </label>
                        </div>
                    </div>

                    {/* Discharge Sub-Types (Only if Alive) */}
                    {status === 'Vivo' && (
                        <div className="space-y-2.5 pt-2 border-l-2 border-emerald-50 pl-4 animate-fade-in">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo de Alta</label>
                            <div className="space-y-2">
                                {[
                                    { id: 'Domicilio (Habitual)', label: 'Alta a domicilio (Habitual)' },
                                    { id: 'Voluntaria', label: 'Alta voluntaria' },
                                    { id: 'Fuga', label: 'Fuga' },
                                    { id: 'Otra', label: 'Otra' }
                                ].map((item) => (
                                    <label key={item.id} className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="dischargeType"
                                            checked={dischargeType === item.id}
                                            onChange={() => setDischargeType(item.id as any)}
                                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500/20"
                                        />
                                        <span className={clsx("text-sm transition-colors", dischargeType === item.id ? "font-medium text-slate-900" : "text-slate-500 group-hover:text-slate-700")}>
                                            {item.label}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {dischargeType === 'Otra' && (
                                <div className="pt-1 animate-fade-in">
                                    <input
                                        type="text"
                                        placeholder="Especifique motivo..."
                                        value={otherDetails}
                                        onChange={(e) => { setOtherDetails(e.target.value); setErrors(prev => ({ ...prev, other: undefined })); }}
                                        className={clsx(
                                            "w-full text-sm p-2 bg-slate-50 border rounded-lg focus:ring-2 focus:outline-none transition-all",
                                            errors.other ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        )}
                                        autoFocus
                                    />
                                    {errors.other && <p className="text-[9px] text-red-500 font-medium mt-1 pl-1">{errors.other}</p>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Discharge Time */}
                    <div className="space-y-1.5 pt-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hora de Alta</label>
                        <div className="max-w-[120px]">
                            <input
                                type="time"
                                className={clsx(
                                    "w-full p-2 bg-slate-50 border rounded-lg text-sm focus:ring-2 focus:outline-none transition-all",
                                    errors.time ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500"
                                )}
                                step={300}
                                value={dischargeTime}
                                onChange={(e) => { setDischargeTime(e.target.value); setErrors(prev => ({ ...prev, time: undefined })); }}
                            />
                        </div>
                        {errors.time && <p className="text-[9px] text-red-500 font-medium mt-1 pl-1">{errors.time}</p>}
                    </div>
                </div>

                {/* Clinical Crib Patient (Baby) - Minimalist */}
                {!isEditing && hasClinicalCrib && onClinicalCribStatusChange && (
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                            Estado Recién Nacido ({clinicalCribName || 'RN'})
                        </label>
                        <div className="flex gap-6 pl-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="radio" name="cribStatus" value="Vivo"
                                    checked={clinicalCribStatus === 'Vivo'}
                                    onChange={() => onClinicalCribStatusChange('Vivo')}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500/20"
                                />
                                <span className={clsx("text-sm transition-colors", clinicalCribStatus === 'Vivo' ? "font-bold text-slate-900" : "text-slate-500 group-hover:text-slate-700")}>Vivo</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="radio" name="cribStatus" value="Fallecido"
                                    checked={clinicalCribStatus === 'Fallecido'}
                                    onChange={() => onClinicalCribStatusChange('Fallecido')}
                                    className="w-4 h-4 text-red-600 focus:ring-red-500/20"
                                />
                                <span className={clsx("text-sm transition-colors", clinicalCribStatus === 'Fallecido' ? "font-bold text-slate-900" : "text-slate-500 group-hover:text-slate-700")}>Fallecido</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Footer Actions - Standard Clean Style */}
                <div className="pt-6 flex justify-end items-center gap-4">
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 text-sm font-semibold transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-600/10 hover:bg-emerald-700 transition-all transform active:scale-95"
                    >
                        {isEditing ? 'Guardar Cambios' : 'Confirmar Alta'}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
