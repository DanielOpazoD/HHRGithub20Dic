import React from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, X } from 'lucide-react';
import { DeviceInfo } from '../../types';
import { calculateDeviceDays } from './DeviceDateConfigModal';

interface VvpConfigModalProps {
    count: number;
    details: DeviceInfo[];
    currentDate?: string;
    onSave: (info: DeviceInfo[]) => void;
    onClose: () => void;
}

const prepareDetails = (details: DeviceInfo[], count: number) => {
    const next = [...details];
    while (next.length < count) next.push({});
    return next.slice(0, count);
};

export const VvpConfigModal: React.FC<VvpConfigModalProps> = ({
    count,
    details,
    currentDate,
    onSave,
    onClose,
}) => {
    const [tempDetails, setTempDetails] = React.useState<DeviceInfo[]>(() => prepareDetails(details, count));

    React.useEffect(() => {
        setTempDetails(prepareDetails(details, count));
    }, [count, details]);

    const handleSave = () => {
        const cleaned = tempDetails.map(entry => ({
            ...entry,
            note: entry.note?.trim() || undefined
        }));
        onSave(cleaned);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl animate-scale-in">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 rounded-t-lg">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={16} className="text-medical-600" />
                        VVP - Vías Venosas Periféricas
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    {tempDetails.map((detail, index) => {
                        const installDate = detail.installationDate;
                        const removalDate = detail.removalDate;
                        const note = detail.note || '';
                        const days = installDate ? calculateDeviceDays(installDate, currentDate) : null;

                        return (
                            <div key={index} className="p-3 border border-slate-100 rounded-lg bg-slate-50">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold text-slate-700">VVP #{index + 1}</h4>
                                    {days !== null && (
                                        <span className="flex items-center gap-1 text-xs text-slate-600">
                                            <Clock size={12} />
                                            {days} días
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                            Fecha de Instalación
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-medical-500 focus:outline-none"
                                            value={installDate || ''}
                                            max={currentDate}
                                            onChange={(e) => {
                                                const next = [...tempDetails];
                                                next[index] = { ...next[index], installationDate: e.target.value };
                                                setTempDetails(next);
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                            Fecha de Retiro <span className="font-normal text-slate-400 lowercase">(opcional)</span>
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-medical-500 focus:outline-none"
                                            value={removalDate || ''}
                                            min={installDate}
                                            max={currentDate}
                                            onChange={(e) => {
                                                const next = [...tempDetails];
                                                next[index] = { ...next[index], removalDate: e.target.value };
                                                setTempDetails(next);
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                        Nota del dispositivo <span className="font-normal text-slate-400 lowercase">(opcional)</span>
                                    </label>
                                    <textarea
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-medical-500 focus:outline-none"
                                        rows={2}
                                        placeholder="Ubicación, calibre, cm, etc."
                                        value={note}
                                        onChange={(e) => {
                                            const next = [...tempDetails];
                                            next[index] = { ...next[index], note: e.target.value };
                                            setTempDetails(next);
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-slate-500 hover:bg-slate-200 rounded text-sm transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-3 py-1.5 bg-medical-600 text-white rounded text-sm font-medium hover:bg-medical-700 transition-colors shadow-sm"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
