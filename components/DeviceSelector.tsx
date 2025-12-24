import React, { useState } from 'react';
import { Plus, X, Check, Settings } from 'lucide-react';
import clsx from 'clsx';
import { DEVICE_OPTIONS } from '../constants';
import { DeviceDetails, DeviceInfo } from '../types';
import {
    DeviceDateConfigModal,
    DeviceBadge,
    TRACKED_DEVICES,
    TrackedDevice
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
    const [editingDevice, setEditingDevice] = useState<TrackedDevice | null>(null);

    const isVvp = (dev: string) => dev === 'VVP' || dev === '2 VVP' || dev.startsWith('VVP#');

    // Helper to determine VVP state: 0 to 3
    const vvpSelected = devices.filter(isVvp);
    const legacyVvpCount = devices.includes('2 VVP') ? 2 : devices.includes('VVP') ? 1 : 0;
    const vvpCount = Math.max(vvpSelected.length, legacyVvpCount);
    const activeVvpDevices = vvpSelected.filter(dev => dev.startsWith('VVP#')).length > 0
        ? vvpSelected.filter(dev => dev.startsWith('VVP#'))
        : Array.from({ length: vvpCount }, (_, idx) => `VVP#${idx + 1}`);

    // Normalize legacy VVP strings to new VVP# format for consistent configuration
    React.useEffect(() => {
        if (devices.some(dev => dev === 'VVP' || dev === '2 VVP')) {
            setVVPCount(vvpCount);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [devices]);

    // Filter out VVP related strings to get "other" devices
    const otherDevicesList = DEVICE_OPTIONS.filter(d => !d.startsWith('VVP'));

    const setVVPCount = (count: number) => {
        const cleanedDevices = devices.filter(d => !isVvp(d));
        const vvpDevices = Array.from({ length: count }, (_, idx) => `VVP#${idx + 1}`);
        onChange([...cleanedDevices, ...vvpDevices]);
    };

    const toggleDevice = (device: string) => {
        if (devices.includes(device)) {
            onChange(devices.filter(d => d !== device));
            // Also clear details if tracked device is removed
            if (TRACKED_DEVICES.includes(device as TrackedDevice) && onDetailsChange) {
                const newDetails = { ...deviceDetails };
                delete newDetails[device as TrackedDevice];
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

    const handleDeviceConfigSave = (info: DeviceInfo) => {
        if (editingDevice && onDetailsChange) {
            onDetailsChange({
                ...deviceDetails,
                [editingDevice]: info
            });
        }
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
                                <label className="text-xs font-semibold text-slate-600 mb-2 block">Vías Venosas (VVP)</label>
                                <div className="grid grid-cols-4 gap-2">
                                    <button
                                        onClick={() => setVVPCount(0)}
                                        className={clsx(
                                            "py-1 text-xs rounded border transition-colors",
                                            vvpCount === 0 ? "bg-slate-200 text-slate-600 border-slate-300 shadow-inner" : "hover:bg-slate-50 text-slate-500"
                                        )}
                                    >
                                        Ninguna
                                    </button>
                                    <button
                                        onClick={() => setVVPCount(1)}
                                        className={clsx(
                                            "py-1 text-xs rounded border transition-colors",
                                            vvpCount === 1 ? "bg-medical-600 text-white border-medical-700 shadow-sm" : "hover:bg-medical-50 text-medical-600 border-medical-200"
                                        )}
                                    >
                                        1
                                    </button>
                                    <button
                                        onClick={() => setVVPCount(2)}
                                        className={clsx(
                                            "py-1 text-xs rounded border transition-colors",
                                            vvpCount === 2 ? "bg-purple-600 text-white border-purple-700 shadow-sm" : "hover:bg-purple-50 text-purple-600 border-purple-200"
                                        )}
                                    >
                                        2
                                    </button>
                                    <button
                                        onClick={() => setVVPCount(3)}
                                        className={clsx(
                                            "py-1 text-xs rounded border transition-colors",
                                            vvpCount === 3 ? "bg-indigo-600 text-white border-indigo-700 shadow-sm" : "hover:bg-indigo-50 text-indigo-600 border-indigo-200"
                                        )}
                                    >
                                        3
                                    </button>
                                </div>

                                {vvpCount > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {activeVvpDevices.map(vvpName => {
                                            const details = deviceDetails[vvpName as TrackedDevice];
                                            const hasConfig = !!details?.installationDate || !!details?.removalDate || !!details?.note;
                                            return (
                                                <button
                                                    key={vvpName}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingDevice(vvpName as TrackedDevice);
                                                    }}
                                                    className={clsx(
                                                        "px-2 py-1 text-[10px] rounded border flex items-center gap-1 transition-colors",
                                                        hasConfig
                                                            ? "border-medical-200 text-medical-700 bg-medical-50"
                                                            : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                                    )}
                                                    title="Configurar fechas"
                                                >
                                                    {vvpName}
                                                    <Settings size={10} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
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
                                {devices.filter(d => !DEVICE_OPTIONS.includes(d) && !isVvp(d)).length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {devices.filter(d => !DEVICE_OPTIONS.includes(d) && !isVvp(d)).map(dev => (
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
            {editingDevice && (
                <DeviceDateConfigModal
                    device={editingDevice}
                    deviceInfo={deviceDetails[editingDevice] || {}}
                    currentDate={currentDate}
                    onSave={handleDeviceConfigSave}
                    onClose={() => setEditingDevice(null)}
                />
            )}
        </>
    );
};
