import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Settings, Clock } from 'lucide-react';
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
    const triggerRef = React.useRef<HTMLDivElement>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

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

    const updateMenuPosition = React.useCallback(() => {
        if (!showMenu || !triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const margin = 8;
        const viewportTop = window.scrollY + margin;
        const viewportBottom = window.scrollY + window.innerHeight - margin;
        const width = menuRef.current?.offsetWidth ?? 256;
        const height = menuRef.current?.offsetHeight ?? 0;

        let left = rect.left + window.scrollX;
        left = Math.min(left, window.scrollX + window.innerWidth - width - margin);
        left = Math.max(window.scrollX + margin, left);

        let top = rect.bottom + margin + window.scrollY;
        if (height && top + height > viewportBottom) {
            const aboveTop = rect.top + window.scrollY - height - margin;
            top = aboveTop >= viewportTop ? aboveTop : viewportTop;
        }

        setMenuStyle({
            top,
            left,
            maxHeight: `${viewportBottom - viewportTop}px`
        });
    }, [showMenu]);

    useLayoutEffect(() => {
        updateMenuPosition();
    }, [showMenu, devices.length, selectedVvps.length, updateMenuPosition]);

    React.useEffect(() => {
        if (!showMenu) return;

        const handleWindowChange = () => updateMenuPosition();
        window.addEventListener('resize', handleWindowChange);
        window.addEventListener('scroll', handleWindowChange, true);

        return () => {
            window.removeEventListener('resize', handleWindowChange);
            window.removeEventListener('scroll', handleWindowChange, true);
        };
    }, [showMenu, updateMenuPosition]);

    if (disabled) return null;

    return (
        <>
            {/* Device Badges Display */}
            <div
                className="flex flex-wrap gap-1 min-h-[26px] cursor-pointer items-center justify-start p-1 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors relative"
                onClick={() => setShowMenu(!showMenu)}
                title="Haga clic para gestionar dispositivos"
                ref={triggerRef}
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
                createPortal(
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                        <div
                            ref={menuRef}
                            className="fixed z-50 w-64 bg-white rounded-lg shadow-xl border border-slate-200 animate-scale-in text-left overflow-y-auto"
                            style={menuStyle}
                        >
                            <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center rounded-t-lg">
                                <span className="text-xs font-bold text-slate-700 uppercase">Dispositivos</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="p-3 space-y-3">
                                {/* Special VVP Section */}
                                <div className="space-y-2 pb-3 border-b border-slate-100">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-xs font-semibold text-slate-600 block">Vías Venosas (VVP)</label>
                                        {selectedVvps.length > 0 && (
                                            <button
                                                className="text-slate-500 hover:text-medical-600 text-[11px] flex items-center gap-1"
                                                onClick={(e) => { e.stopPropagation(); setEditingDevice('VVP'); }}
                                                title="Configurar fechas VVP"
                                            >
                                                <Settings size={12} />
                                                Configurar
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        {VVP_DEVICES.map(vvp => {
                                            const isSelected = selectedVvps.includes(vvp);
                                            const detailKey = mapVvpToKey(vvp);
                                            const hasConfig = !!deviceDetails?.[detailKey]?.installationDate;

                                            return (
                                                <label
                                                    key={vvp}
                                                    className={clsx(
                                                        "flex items-center gap-2 px-2 py-1.5 rounded border text-[11px] cursor-pointer transition-colors",
                                                        isSelected ? "bg-slate-50 border-medical-200" : "bg-white border-slate-200 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 accent-medical-500"
                                                        checked={isSelected}
                                                        onChange={() => toggleVvp(vvp)}
                                                    />
                                                    <span className="flex-1 truncate">{vvp}</span>
                                                    {hasConfig && <Clock size={12} className="text-medical-600" />}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Tracked Devices */}
                                <div className="space-y-2 pb-3 border-b border-slate-100">
                                    <label className="text-xs font-semibold text-slate-600 block">Dispositivos IAAS</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {TRACKED_DEVICES.map(dev => {
                                            const isSelected = devices.includes(dev);
                                            const hasConfig = !!deviceDetails?.[dev]?.installationDate;

                                            return (
                                                <label
                                                    key={dev}
                                                    className={clsx(
                                                        "flex items-center gap-2 px-2 py-1.5 rounded border text-[11px] cursor-pointer transition-colors",
                                                        isSelected ? "bg-slate-50 border-medical-200" : "bg-white border-slate-200 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 accent-medical-500"
                                                        checked={isSelected}
                                                        onChange={() => toggleDevice(dev)}
                                                    />
                                                    <span className="flex-1 truncate">{dev}</span>
                                                    {hasConfig && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setEditingDevice(dev as TrackedDevice); }}
                                                            className="text-medical-600 hover:text-medical-700 p-0.5 rounded"
                                                            title="Configurar fechas"
                                                        >
                                                            <Settings size={12} />
                                                        </button>
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Other Devices */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-600 block">Otros dispositivos</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {otherDevicesList.map(dev => {
                                            const isSelected = devices.includes(dev);
                                            return (
                                                <label
                                                    key={dev}
                                                    className={clsx(
                                                        "flex items-center gap-2 px-2 py-1.5 rounded border text-[11px] cursor-pointer transition-colors",
                                                        isSelected ? "bg-slate-50 border-medical-200" : "bg-white border-slate-200 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 accent-medical-500"
                                                        checked={isSelected}
                                                        onChange={() => toggleDevice(dev)}
                                                    />
                                                    <span className="flex-1 truncate">{dev}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Free Text Custom Device */}
                                <div className="pt-2 border-t border-slate-100 space-y-2">
                                    <label className="text-xs font-semibold text-slate-600 block">Otro Dispositivo</label>
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

                                    {devices.filter(d => !DEVICE_OPTIONS.includes(d)).length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
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
                    </>,
                    document.body
                )
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
