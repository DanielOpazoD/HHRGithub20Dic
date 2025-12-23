import React from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { DeviceDetails, DeviceInfo } from '../../types';

export const VVP_DEVICES = ['VVP 1', 'VVP 2', 'VVP 3'] as const;
export type VvpDevice = typeof VVP_DEVICES[number];

// Devices that require date tracking (IAAS surveillance)
export const TRACKED_DEVICES = ['CUP', 'CVC', 'VMI', 'VVP'] as const;
export type TrackedDevice = typeof TRACKED_DEVICES[number];

export const DEVICE_LABELS: Record<TrackedDevice, string> = {
    'CUP': 'Sonda Foley',
    'CVC': 'Catéter Venoso Central',
    'VMI': 'Ventilación Mecánica Invasiva',
    'VVP': 'Vía Venosa Periférica'
};

export const VVP_DEVICE_DETAIL_KEYS: Record<VvpDevice, keyof DeviceDetails> = {
    'VVP 1': 'VVP1',
    'VVP 2': 'VVP2',
    'VVP 3': 'VVP3'
};

/**
 * Calculate days since installation
 */
export const calculateDeviceDays = (installDate?: string, currentDate?: string): number | null => {
    if (!installDate || !currentDate) return null;
    const start = new Date(installDate);
    const end = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = end.getTime() - start.getTime();
    const days = Math.floor(diff / (1000 * 3600 * 24));
    return days >= 0 ? days : 0;
};

interface DeviceDateConfigModalProps {
    device: TrackedDevice;
    deviceDetails: DeviceDetails;
    activeVvps?: VvpDevice[];
    currentDate?: string;
    onSave: (info: DeviceDetails) => void;
    onClose: () => void;
}

export const DeviceDateConfigModal: React.FC<DeviceDateConfigModalProps> = ({
    device,
    deviceDetails,
    activeVvps = [],
    currentDate,
    onSave,
    onClose
}) => {
    const [tempDetails, setTempDetails] = React.useState<DeviceDetails>(deviceDetails || {});

    React.useEffect(() => {
        setTempDetails(deviceDetails || {});
    }, [deviceDetails]);

    const handleInfoChange = (key: keyof DeviceDetails, field: keyof DeviceInfo, value: string) => {
        setTempDetails(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] as DeviceInfo || {}),
                [field]: value
            }
        }));
    };

    const handleSave = () => {
        const cleanedDetails = { ...tempDetails };

        if (device === 'VVP') {
            VVP_DEVICES.forEach(vvp => {
                const detailKey = VVP_DEVICE_DETAIL_KEYS[vvp];
                if (!activeVvps.includes(vvp)) {
                    delete cleanedDetails[detailKey];
                }
            });
        }

        onSave(cleanedDetails);
        onClose();
    };

    const renderDeviceFields = (label: string, detailKey: keyof DeviceDetails) => {
        const info = (tempDetails[detailKey] as DeviceInfo) || {};
        const days = info.installationDate ? calculateDeviceDays(info.installationDate, currentDate) : null;

        return (
            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        {label === 'VMI' ? 'Fecha de Inicio' : 'Fecha de Instalación'}
                    </label>
                    <input
                        type="date"
                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-medical-500 focus:outline-none"
                        value={info.installationDate || ''}
                        max={currentDate}
                        onChange={(e) => handleInfoChange(detailKey, 'installationDate', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        {label === 'VMI' ? 'Fecha de Término' : 'Fecha de Retiro'}
                        <span className="font-normal text-slate-400 ml-1">(opcional)</span>
                    </label>
                    <input
                        type="date"
                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-medical-500 focus:outline-none"
                        value={info.removalDate || ''}
                        min={info.installationDate}
                        max={currentDate}
                        onChange={(e) => handleInfoChange(detailKey, 'removalDate', e.target.value)}
                    />
                </div>

                {info.installationDate && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                        <Clock size={14} className="text-slate-500" />
                        <span className="text-sm text-slate-600">
                            Días con dispositivo: <strong>{days}</strong>
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xs animate-scale-in">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 rounded-t-lg">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={16} className="text-medical-600" />
                        {device === 'VVP' ? `${DEVICE_LABELS[device]} (VVP)` : `${device} - ${DEVICE_LABELS[device]}`}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {device === 'VVP' ? (
                        activeVvps.filter(vvp => VVP_DEVICES.includes(vvp)).length === 0 ? (
                            <div className="p-3 text-xs text-slate-500 bg-slate-50 rounded border border-slate-100">
                                Seleccione VVP 1, VVP 2 o VVP 3 desde el listado para configurar fechas.
                            </div>
                        ) : (
                            activeVvps
                                .filter(vvp => VVP_DEVICES.includes(vvp))
                                .map(vvp => {
                                    const detailKey = VVP_DEVICE_DETAIL_KEYS[vvp];
                                    return (
                                        <div key={vvp} className="space-y-2 border border-slate-100 rounded p-3 bg-slate-50">
                                            <div className="text-[11px] font-semibold text-slate-600 uppercase">{vvp}</div>
                                            {renderDeviceFields(vvp, detailKey)}
                                        </div>
                                    );
                                })
                        )
                    ) : (
                        renderDeviceFields(device, device as keyof DeviceDetails)
                    )}
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
        </div>
    );
};
