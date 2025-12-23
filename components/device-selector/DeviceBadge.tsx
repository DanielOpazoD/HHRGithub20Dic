import React from 'react';
import clsx from 'clsx';
import { calculateDeviceDays, TRACKED_DEVICES, TrackedDevice, VVP_DEVICE_DETAIL_KEYS, VVP_DEVICES, VvpDevice } from './DeviceDateConfigModal';
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
    const badgeText = device;
    const isVvp = VVP_DEVICES.includes(device as VvpDevice);
    const isTracked = TRACKED_DEVICES.includes(device as TrackedDevice);
    const details = isTracked
        ? deviceDetails[device as TrackedDevice]
        : isVvp
            ? deviceDetails[VVP_DEVICE_DETAIL_KEYS[device as VvpDevice]]
            : undefined;
    const days = details?.installationDate ? calculateDeviceDays(details.installationDate, currentDate) : null;

    // Alert colors based on days (IAAS thresholds)
    const isAlert = !isVvp && isTracked && days !== null && (
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
        >
            {badgeText}
            {days !== null && (
                <span className="text-[8px] opacity-70 ml-0.5">({days}d)</span>
            )}
        </span>
    );
};
