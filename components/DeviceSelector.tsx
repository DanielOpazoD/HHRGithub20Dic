import React, { useState } from 'react';
import { Plus, X, Check, Settings, Clock } from 'lucide-react';
import clsx from 'clsx';
import { DEVICE_OPTIONS } from '../constants';
import { DeviceDetails, DeviceInfo } from '../types';
import {
    DeviceDateConfigModal,
    VvpDateConfigModal,
    DeviceBadge,
    TRACKED_DEVICES,
    TrackedDevice,
    VVP_DEVICES,
    mapVvpToKey
} from './device-selector';

interface DeviceSelectorProps {
    devices: string[];
    deviceDetails?: DeviceDetails;
    onChange: (newDevices: string[]) => void;
    onDetailsChange?: (details: DeviceDetails) => void;
    disabled?: boolean;
    currentDate?: string;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
    devices = [],
    deviceDetails = {},
    onChange,
    onDetailsChange,
    disabled,
    currentDate
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [customDevice, setCustomDevice] = useState('');
    const [editingDevice, setEditingDevice] = useState<TrackedDevice | 'VVP' | null>(null);

    const normalizeVvp = (label: string): typeof VVP_DEVICES[number] | null => {
        if (label === 'VVP' || label === 'VVP 1') return 'VVP';
        if (label === 'VVP 2') return 'VVP 2';
        if (label === 'VVP 3') return 'VVP 3';
        return null;
    };

    const selectedVvps = Array.from(new Set(devices
        .map(normalizeVvp)
        .filter((v): v is typeof VVP_DEVICES[number] => v !== null)));

    // Filter out VVP related strings to get "other" devices
    const otherDevicesList = DEVICE_OPTIONS.filter(d => !normalizeVvp(d));

    const getDetailKey = (device: string) => {
        if (TRACKED_DEVICES.includes(device as TrackedDevice)) {
            return device as TrackedDevice;
        }
        const normalizedVvp = normalizeVvp(device);
        if (normalizedVvp) {
            return mapVvpToKey(normalizedVvp);
        }
        return null;
    };

    const toggleVvp = (device: typeof VVP_DEVICES[number]) => {
        const isSelected = selectedVvps.includes(device);
        const cleanedDevices = devices.filter(d => normalizeVvp(d) !== device);
        const newDevices = isSelected
            ? cleanedDevices
            : [...cleanedDevices, device];
        onChange(newDevices);

        if (isSelected && onDetailsChange) {
            const key = mapVvpToKey(device);
            const newDetails = { ...deviceDetails };
            delete newDetails[key];
            onDetailsChange(newDetails);
        }
    };

    const toggleDevice = (device: string) => {
        if (devices.includes(device)) {
            onChange(devices.filter(d => d !== device));
            // Also clear details if tracked device is removed
            const key = getDetailKey(device);
            if (key && onDetailsChange) {
                const newDetails = { ...deviceDetails };
                delete newDetails[key];
                onDetailsChange(newDetails);
            }
        } else {
            onChange([...devices, device]);
        }
    };

    const addCustomDevice = () => {
        if (customDevice.trim()) {
            const dev = customDevice.trim();
            if (!devices.includes(dev)) {
                onChange([...devices, dev]);
            }
            setCustomDevice('');
        }
    };

    const handleDeviceConfigSave = (info: DeviceInfo | Partial<DeviceDetails>) => {
        if (!editingDevice || !onDetailsChange) return;

        if (editingDevice === 'VVP') {
            const updates = info as Partial<DeviceDetails>;
            const newDetails = { ...deviceDetails };
            (['VVP1', 'VVP2', 'VVP3'] as const).forEach(key => {
                if (Object.prototype.hasOwnProperty.call(updates, key)) {
                    const value = updates[key];
                    if (value?.installationDate || value?.removalDate) {
                        newDetails[key] = value;
                    } else {
                        delete newDetails[key];
                    }
                }
            });
            onDetailsChange(newDetails);
            return;
        }

        onDetailsChange({
            ...deviceDetails,
            [editingDevice]: info as DeviceInfo
        });
    };

    const isTrackedDevice = (dev: string): dev is TrackedDevice =>
        TRACKED_DEVICES.includes(dev as TrackedDevice);

    if (disabled) return null;

    return (
        <>
            {/* Device Badges Display */}
            <div
                className="flex flex-wrap gap-1 min-h-[26px] cursor-pointer items-center justify-start p-1 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors relative"
                onClick={() => setShowMenu(!showMenu)}
                title="Haga clic para gestionar dispositivos"
            >
                {devices.length === 0 && (
                    <span className="text-slate-300 mx-auto flex items-center justify-center w-full opacity-50">
                        <Plus size={14} />
                    </span>
                )}
                {devices.map((dev, i) => (
                    <DeviceBadge
                        key={i}
                        device={dev}
                        deviceDetails={deviceDetails}
                        currentDate={currentDate}
                    />
                ))}
            </div>

            {/* Dropdown Menu */}
            {showMenu && (
                <>
                    <div className="absolute z-50 mt-1 right-0 w-64 bg-white rounded-lg shadow-xl border border-slate-200 animate-scale-in text-left">
                        <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center rounded-t-lg">
                            <span className="text-xs font-bold text-slate-700 uppercase">Dispositivos</span>
                            <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} className="text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="p-3">
                            {/* Special VVP Section */}
                            <div className="mb-3 pb-3 border-b border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold text-slate-600 block">Vías Venosas (VVP)</label>
                                    {selectedVvps.length > 0 && (
                                        <button
                                            className="text-slate-500 hover:text-medical-600 text-xs flex items-center gap-1"
                                            onClick={(e) => { e.stopPropagation(); setEditingDevice('VVP'); }}
                                            title="Configurar fechas VVP"
                                        >
                                            <Settings size={12} />
                                            Configurar
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {VVP_DEVICES.map(vvp => {
                                        const isSelected = selectedVvps.includes(vvp);
                                        const detailKey = mapVvpToKey(vvp);
                                        const hasConfig = !!deviceDetails?.[detailKey]?.installationDate;

                                        return (
                                            <button
                                                key={vvp}
                                                onClick={() => toggleVvp(vvp)}
                                                className={clsx(
                                                    "flex-1 min-w-[70px] flex items-center gap-2 px-2 py-1.5 rounded border text-xs text-left transition-colors",
                                                    isSelected
                                                        ? "bg-medical-50 border-medical-200 text-medical-800"
                                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                )}
                                            >
                                                <div className={clsx(
                                                    "w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0",
                                                    isSelected ? "bg-medical-600 border-medical-600" : "border-slate-300"
                                                )}>
                                                    {isSelected && <Check size={10} className="text-white" />}
                                                </div>
                                                <span className="flex-1 truncate">{vvp}</span>
                                                {isSelected && hasConfig && <Clock size={12} className="text-medical-500" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Other Devices Grid */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {otherDevicesList.map(dev => {
                                    const isTracked = isTrackedDevice(dev);
                                    const isSelected = devices.includes(dev);
                                    const details = isTracked ? deviceDetails[dev as TrackedDevice] : undefined;
                                    const hasConfig = details?.installationDate;

                                    return (
                                        <div key={dev} className="relative">
                                            <button
                                                onClick={() => toggleDevice(dev)}
                                                className={clsx(
                                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded border text-xs text-left transition-colors",
                                                    isSelected
                                                        ? "bg-medical-50 border-medical-200 text-medical-800"
                                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                )}
                                            >
                                                <div className={clsx(
                                                    "w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0",
                                                    isSelected ? "bg-medical-600 border-medical-600" : "border-slate-300"
                                                )}>
                                                    {isSelected && <Check size={10} className="text-white" />}
                                                </div>
                                                <span className="flex-1 truncate">{dev}</span>

                                                {/* Config icon for tracked devices */}
                                                {isTracked && isSelected && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingDevice(dev);
                                                        }}
                                                        className={clsx(
                                                            "p-0.5 rounded hover:bg-medical-100 transition-colors",
                                                            hasConfig ? "text-medical-600" : "text-slate-400"
                                                        )}
                                                        title="Configurar fechas"
                                                    >
                                                        <Settings size={12} />
                                                    </button>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Free Text Custom Device */}
                            <div className="pt-2 border-t border-slate-100">
                                <label className="text-xs font-semibold text-slate-600 mb-2 block">Otro Dispositivo</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customDevice}
                                        onChange={(e) => setCustomDevice(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addCustomDevice()}
                                        className="flex-1 text-xs p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-medical-500 focus:outline-none"
                                        placeholder="Escribir..."
                                    />
                                    <button
                                        onClick={addCustomDevice}
                                        disabled={!customDevice.trim()}
                                        className="p-1.5 bg-medical-500 text-white rounded hover:bg-medical-600 disabled:opacity-50"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>

                                {/* Show custom devices (not in DEVICE_OPTIONS) with remove button */}
                                {devices.filter(d => !DEVICE_OPTIONS.includes(d)).length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {devices.filter(d => !DEVICE_OPTIONS.includes(d)).map(dev => (
                                            <span
                                                key={dev}
                                                className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium flex items-center gap-1"
                                            >
                                                {dev}
                                                <button
                                                    onClick={() => onChange(devices.filter(d => d !== dev))}
                                                    className="text-amber-500 hover:text-red-500 ml-0.5"
                                                    title="Eliminar dispositivo"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                </>
            )}

            {/* Device Configuration Modal */}
            {editingDevice && editingDevice !== 'VVP' && (
                <DeviceDateConfigModal
                    device={editingDevice as TrackedDevice}
                    deviceInfo={deviceDetails[editingDevice as TrackedDevice] || {}}
                    currentDate={currentDate}
                    onSave={handleDeviceConfigSave}
                    onClose={() => setEditingDevice(null)}
                />
            )}

            {editingDevice === 'VVP' && selectedVvps.length > 0 && (
                <VvpDateConfigModal
                    activeDevices={selectedVvps}
                    deviceDetails={deviceDetails}
                    currentDate={currentDate}
                    onSave={handleDeviceConfigSave}
                    onClose={() => setEditingDevice(null)}
                />
            )}
        </>
    );
};
