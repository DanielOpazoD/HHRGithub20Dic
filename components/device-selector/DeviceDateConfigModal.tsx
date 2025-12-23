import React from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { DeviceDetails, DeviceInfo } from '../../types';

// Devices that require date tracking (IAAS surveillance)
export const TRACKED_DEVICES = ['CUP', 'CVC', 'VMI'] as const;
export type TrackedDevice = typeof TRACKED_DEVICES[number];

export const VVP_DEVICES = ['VVP 1', 'VVP 2', 'VVP 3'] as const;
export type VvpDevice = typeof VVP_DEVICES[number];
type VvpDeviceKey = 'VVP1' | 'VVP2' | 'VVP3';

export const DEVICE_LABELS: Record<TrackedDevice, string> = {
    'CUP': 'Sonda Foley',
    'CVC': 'Catéter Venoso Central',
    'VMI': 'Ventilación Mecánica Invasiva'
};

export const mapVvpToKey = (device: VvpDevice): VvpDeviceKey => {
    switch (device) {
        case 'VVP 1': return 'VVP1';
        case 'VVP 2': return 'VVP2';
        case 'VVP 3': return 'VVP3';
    }
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
    deviceInfo: DeviceInfo;
    currentDate?: string;
    onSave: (info: DeviceInfo) => void;
    onClose: () => void;
}

export const DeviceDateConfigModal: React.FC<DeviceDateConfigModalProps> = ({
    device,
    deviceInfo,
    currentDate,
    onSave,
    onClose
}) => {
    const [tempDetails, setTempDetails] = React.useState<DeviceInfo>(deviceInfo);

    const handleSave = () => {
        onSave(tempDetails);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xs animate-scale-in">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 rounded-t-lg">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={16} className="text-medical-600" />
                        {device} - {DEVICE_LABELS[device]}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            {device === 'VMI' ? 'Fecha de Inicio' : 'Fecha de Instalación'}
                        </label>
                        <input
                            type="date"
                            className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-medical-500 focus:outline-none"
                            value={tempDetails.installationDate || ''}
                            max={currentDate}
                            onChange={(e) => setTempDetails({ ...tempDetails, installationDate: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            {device === 'VMI' ? 'Fecha de Término' : 'Fecha de Retiro'}
                            <span className="font-normal text-slate-400 ml-1">(opcional)</span>
                        </label>
                        <input
                            type="date"
                            className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-medical-500 focus:outline-none"
                            value={tempDetails.removalDate || ''}
                            min={tempDetails.installationDate}
                            max={currentDate}
                            onChange={(e) => setTempDetails({ ...tempDetails, removalDate: e.target.value })}
                        />
                    </div>

                    {/* Days counter */}
                    {tempDetails.installationDate && (
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                            <Clock size={14} className="text-slate-500" />
                            <span className="text-sm text-slate-600">
                                Días con dispositivo: <strong>{calculateDeviceDays(tempDetails.installationDate, currentDate)}</strong>
                            </span>
                        </div>
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

interface VvpDateConfigModalProps {
    activeDevices: VvpDevice[];
    deviceDetails?: DeviceDetails;
    currentDate?: string;
    onSave: (info: Partial<DeviceDetails>) => void;
    onClose: () => void;
}

export const VvpDateConfigModal: React.FC<VvpDateConfigModalProps> = ({
    activeDevices,
    deviceDetails = {},
    currentDate,
    onSave,
    onClose
}) => {
    const initialState = React.useMemo(() => {
        const seed: Partial<Record<VvpDeviceKey, DeviceInfo>> = {};
        activeDevices.forEach(dev => {
            const key = mapVvpToKey(dev);
            seed[key] = deviceDetails[key] || {};
        });
        return seed;
    }, [activeDevices, deviceDetails]);

    const [tempDetails, setTempDetails] = React.useState<Partial<Record<VvpDeviceKey, DeviceInfo>>>(initialState);

    const handleChange = (key: VvpDeviceKey, field: keyof DeviceInfo, value: string) => {
        setTempDetails(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                [field]: value
            }
        }));
    };

    const handleSave = () => {
        const updates: Partial<DeviceDetails> = {};
        activeDevices.forEach(dev => {
            const key = mapVvpToKey(dev);
            const info = tempDetails[key];
            if (info?.installationDate || info?.removalDate) {
                updates[key] = info;
            } else {
                updates[key] = undefined;
            }
        });
        onSave(updates);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm animate-scale-in">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 rounded-t-lg">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={16} className="text-medical-600" />
                        Configuración VVP
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {activeDevices.map(device => {
                        const key = mapVvpToKey(device);
                        const info = tempDetails[key] || {};

                        return (
                            <div key={device} className="space-y-3 border border-slate-100 rounded p-3 bg-slate-50/60">
                                <div className="text-xs font-bold text-slate-600 uppercase">{device}</div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                        Fecha de Instalación
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-medical-500 focus:outline-none"
                                        value={info.installationDate || ''}
                                        max={currentDate}
                                        onChange={(e) => handleChange(key, 'installationDate', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                        Fecha de Retiro
                                        <span className="font-normal text-slate-400 ml-1">(opcional)</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-medical-500 focus:outline-none"
                                        value={info.removalDate || ''}
                                        min={info.installationDate}
                                        max={currentDate}
                                        onChange={(e) => handleChange(key, 'removalDate', e.target.value)}
                                    />
                                </div>

                                {info.installationDate && (
                                    <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-100">
                                        <Clock size={14} className="text-slate-500" />
                                        <span className="text-sm text-slate-600">
                                            Días con dispositivo:{' '}
                                            <strong>{calculateDeviceDays(info.installationDate, currentDate)}</strong>
                                        </span>
                                    </div>
                                )}
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
        </div>
    );
};
