/**
 * useAudit Hook
 * Provides audit logging functions with user context.
 * Must be used within a component that has access to authenticated user.
 */

import React, { useCallback } from 'react';
import { logAuditEvent, getAuditLogs, AUDIT_ACTION_LABELS } from '../services/admin/auditService';
import { AuditAction, AuditLogEntry } from '../types/audit';

interface UseAuditReturn {
    // Logging functions
    logPatientAdmission: (bedId: string, patientName: string, rut: string, recordDate: string) => void;
    logPatientDischarge: (bedId: string, patientName: string, rut: string, status: string, recordDate: string) => void;
    logPatientTransfer: (bedId: string, patientName: string, rut: string, destination: string, recordDate: string) => void;
    logPatientCleared: (bedId: string, patientName: string, rut: string, recordDate: string) => void;
    logDailyRecordDeleted: (date: string) => void;
    logDailyRecordCreated: (date: string, copiedFrom?: string) => void;
    logPatientView: (bedId: string, patientName: string, rut: string, recordDate: string, authors?: string) => void;
    // Generic logger
    logEvent: (action: AuditAction, entityType: AuditLogEntry['entityType'], entityId: string, details: Record<string, unknown>, patientRut?: string, recordDate?: string, authors?: string) => void;
    // Smart logger (debounced)
    logDebouncedEvent: (action: AuditAction, entityType: AuditLogEntry['entityType'], entityId: string, details: Record<string, unknown>, patientRut?: string, recordDate?: string, authors?: string) => void;
    // Fetching
    fetchLogs: (limit?: number) => Promise<AuditLogEntry[]>;
    // Labels
    getActionLabel: (action: AuditAction) => string;
}

export const useAudit = (userId: string): UseAuditReturn => {
    // Store timers for debounced events (key: action-entityId)
    const timersRef = React.useRef<Record<string, {
        timer: NodeJS.Timeout,
        details: Record<string, unknown>,
        rut?: string,
        date?: string,
        authors?: string
    }>>({});

    const logEvent = useCallback((
        action: AuditAction,
        entityType: AuditLogEntry['entityType'],
        entityId: string,
        details: Record<string, unknown>,
        patientRut?: string,
        recordDate?: string,
        authors?: string
    ) => {
        // Fire and forget - don't await
        logAuditEvent(userId, action, entityType, entityId, details, patientRut, recordDate, authors);
    }, [userId]);

    const logDebouncedEvent = useCallback((
        action: AuditAction,
        entityType: AuditLogEntry['entityType'],
        entityId: string,
        details: Record<string, unknown>,
        patientRut?: string,
        recordDate?: string,
        authors?: string
    ) => {
        const key = `${action}-${entityId}`;

        // Clear existing timer if any
        if (timersRef.current[key]) {
            clearTimeout(timersRef.current[key].timer);
        }

        // Set a new timer (5 minutes window for related clinical changes)
        // Note: For intensive dev/testing, we might want to lower this to 1 min.
        // But for production medical audits, 5 mins is a good "session" window.
        const timer = setTimeout(() => {
            const pending = timersRef.current[key];
            if (pending) {
                logEvent(action, entityType, entityId, pending.details, pending.rut, pending.date, pending.authors);
                delete timersRef.current[key];
            }
        }, 5 * 60 * 1000);

        // Store latest details and timer
        timersRef.current[key] = {
            timer,
            details,
            rut: patientRut,
            date: recordDate,
            authors
        };
    }, [logEvent]);

    const logPatientAdmission = useCallback((bedId: string, patientName: string, rut: string, recordDate: string) => {
        logEvent('PATIENT_ADMITTED', 'patient', bedId, { patientName, bedId }, rut, recordDate);
    }, [logEvent]);

    const logPatientDischarge = useCallback((bedId: string, patientName: string, rut: string, status: string, recordDate: string) => {
        logEvent('PATIENT_DISCHARGED', 'discharge', bedId, { patientName, status, bedId }, rut, recordDate);
    }, [logEvent]);

    const logPatientTransfer = useCallback((bedId: string, patientName: string, rut: string, destination: string, recordDate: string) => {
        logEvent('PATIENT_TRANSFERRED', 'transfer', bedId, { patientName, destination, bedId }, rut, recordDate);
    }, [logEvent]);

    const logPatientCleared = useCallback((bedId: string, patientName: string, rut: string, recordDate: string) => {
        logEvent('PATIENT_CLEARED', 'patient', bedId, { patientName, bedId }, rut, recordDate);
    }, [logEvent]);

    const logDailyRecordDeleted = useCallback((date: string) => {
        logEvent('DAILY_RECORD_DELETED', 'dailyRecord', date, { date }, undefined, date);
    }, [logEvent]);

    const logDailyRecordCreated = useCallback((date: string, copiedFrom?: string) => {
        logEvent('DAILY_RECORD_CREATED', 'dailyRecord', date, { date, copiedFrom }, undefined, date);
    }, [logEvent]);

    const logPatientView = useCallback((bedId: string, patientName: string, rut: string, recordDate: string, authors?: string) => {
        logEvent('PATIENT_VIEWED', 'patient', bedId, { patientName, bedId }, rut, recordDate, authors);
    }, [logEvent]);

    const fetchLogs = useCallback(async (limit: number = 100): Promise<AuditLogEntry[]> => {
        return getAuditLogs(limit);
    }, []);

    const getActionLabel = useCallback((action: AuditAction): string => {
        return AUDIT_ACTION_LABELS[action] || action;
    }, []);

    return {
        logPatientAdmission,
        logPatientDischarge,
        logPatientTransfer,
        logPatientCleared,
        logDailyRecordDeleted,
        logDailyRecordCreated,
        logPatientView,
        logEvent,
        logDebouncedEvent,
        fetchLogs,
        getActionLabel
    };
};
