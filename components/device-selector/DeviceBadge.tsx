import React from 'react';
import clsx from 'clsx';
import { calculateDeviceDays, TRACKED_DEVICES, TrackedDevice } from './DeviceDateConfigModal';
import { DeviceDetails } from '../../types';

interface DeviceBadgeProps {
    device: string;
    deviceDetails?: DeviceDetails;
    currentDate?: string;
}

export const DeviceBadge: React.FC<DeviceBadgeProps> = ({
    device,
    deviceDetails = {},
    currentDate
}) => {
    let badgeText = device;
    if (device === '2 VVP') badgeText = '2VVP';
    if (device === '3 VVP') badgeText = '3VVP';

    const isTracked = TRACKED_DEVICES.includes(device as TrackedDevice);
    const isVvp = device.includes('VVP');
    const details = isTracked ? deviceDetails[device as TrackedDevice] : undefined;

    let days: number | null = null;
    let noteText: string | undefined;

    if (isVvp) {
        const count = device.startsWith('3') ? 3 : device.startsWith('2') ? 2 : 1;
        const vvpDetails = (deviceDetails?.VVP || []).slice(0, count);
        const dayValues = vvpDetails
            .map(info => info?.installationDate ? calculateDeviceDays(info.installationDate, currentDate) : null)
            .filter((v): v is number => v !== null);
        days = dayValues.length ? Math.max(...dayValues) : null;
        const notePieces = vvpDetails
            .map((info, idx) => info.note?.trim() ? `#${idx + 1}: ${info.note.trim()}` : null)
            .filter(Boolean);
        if (notePieces.length) {
            noteText = notePieces.join(' | ');
        }
    } else {
        days = details?.installationDate ? calculateDeviceDays(details.installationDate, currentDate) : null;
        noteText = details?.note?.trim();
    }

    // Alert colors based on days (IAAS thresholds)
    const isAlert = isTracked && days !== null && (
        (device === 'CUP' && days >= 5) ||
        (device === 'CVC' && days >= 7) ||
        (device === 'VMI' && days >= 5)
    );

    return (
        <span
            className={clsx(
                "text-[9px] px-1 py-0.5 rounded border font-medium whitespace-nowrap flex items-center gap-0.5",
                isAlert
                    ? "bg-orange-100 text-orange-700 border-orange-200"
                    : "bg-medical-50 text-medical-700 border-medical-100"
            )}
            title={noteText}
        >
            {badgeText}
            {days !== null && (
                <span className="text-[8px] opacity-70 ml-0.5">({days}d)</span>
            )}
            {noteText && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" aria-hidden />
            )}
        </span>
    );
};
