/**
 * useHandoffLogic Hook
 * Extracted from HandoffView.tsx for better separation of concerns.
 * Handles handoff state management, note sync, and WhatsApp integration.
 */

import { useState, useMemo, useCallback } from 'react';
import { DailyRecord, PatientData } from '@/types';
import { BEDS } from '@/constants';
import { getShiftSchedule } from '@/utils/dateUtils';
import { getWhatsAppConfig, getMessageTemplates } from '@/services/integrations/whatsapp/whatsappService';

export type NursingShift = 'day' | 'night';

interface UseHandoffLogicParams {
    record: DailyRecord | null;
    type: 'nursing' | 'medical';
    updatePatient: (bedId: string, field: keyof PatientData, value: any) => void;
    updatePatientMultiple: (bedId: string, updates: Partial<PatientData>) => void;
    updateClinicalCrib: (bedId: string, field: keyof PatientData, value: any) => void;
    updateClinicalCribMultiple: (bedId: string, updates: Partial<PatientData>) => void;
    sendMedicalHandoff: (template: string, groupId: string) => Promise<void>;
    onSuccess: (message: string, description?: string) => void;
}

export const useHandoffLogic = ({
    record,
    type,
    updatePatient,
    updatePatientMultiple,
    updateClinicalCrib,
    updateClinicalCribMultiple,
    sendMedicalHandoff,
    onSuccess,
}: UseHandoffLogicParams) => {
    // ========== STATE ==========
    const [selectedShift, setSelectedShift] = useState<NursingShift>('day');
    const [whatsappSending, setWhatsappSending] = useState(false);
    const [whatsappSent, setWhatsappSent] = useState(false);

    const isMedical = type === 'medical';

    // ========== MEMOS ==========
    const visibleBeds = useMemo(() => {
        if (!record) return [];
        const activeExtras = record.activeExtraBeds || [];
        return BEDS.filter(bed => !bed.isExtra || activeExtras.includes(bed.id));
    }, [record]);

    const hasAnyPatients = useMemo(() => {
        if (!record) return false;
        return visibleBeds.some(b => record.beds[b.id].patientName || record.beds[b.id].isBlocked);
    }, [visibleBeds, record]);

    const schedule = useMemo(() => {
        if (!record) return { dayStart: '08:00', dayEnd: '20:00', nightStart: '20:00', nightEnd: '08:00', description: '' };
        return getShiftSchedule(record.date);
    }, [record]);

    const noteField = useMemo((): keyof PatientData => {
        if (!record || isMedical) return 'medicalHandoffNote';
        return selectedShift === 'day' ? 'handoffNoteDayShift' : 'handoffNoteNightShift';
    }, [record, isMedical, selectedShift]);

    // Staff lists - Auto-populate from census if handoff-specific lists are empty
    const deliversList = useMemo(() => {
        if (!record) return [];
        if (selectedShift === 'day') {
            const handoffList = record.handoffDayDelivers || [];
            return handoffList.length > 0 ? handoffList : (record.nursesDayShift || []);
        } else {
            const handoffList = record.handoffNightDelivers || [];
            return handoffList.length > 0 ? handoffList : (record.nursesNightShift || []);
        }
    }, [record, selectedShift]);

    const receivesList = useMemo(() => {
        if (!record) return [];
        if (selectedShift === 'day') {
            const handoffList = record.handoffDayReceives || [];
            return handoffList.length > 0 ? handoffList : (record.nursesNightShift || []);
        } else {
            return record.handoffNightReceives || [];
        }
    }, [record, selectedShift]);

    const tensList = record
        ? (selectedShift === 'day' ? (record.tensDayShift || []) : (record.tensNightShift || []))
        : [];

    // ========== HANDLERS ==========
    const handleNursingNoteChange = useCallback((bedId: string, value: string, isNested: boolean = false) => {
        if (isMedical) {
            if (isNested) {
                updateClinicalCrib(bedId, 'medicalHandoffNote', value);
            } else {
                updatePatient(bedId, 'medicalHandoffNote', value);
            }
        } else {
            if (selectedShift === 'day') {
                if (isNested) {
                    updateClinicalCribMultiple(bedId, {
                        handoffNoteDayShift: value,
                        handoffNoteNightShift: value
                    });
                } else {
                    updatePatientMultiple(bedId, {
                        handoffNoteDayShift: value,
                        handoffNoteNightShift: value
                    });
                }
            } else {
                if (isNested) {
                    updateClinicalCrib(bedId, 'handoffNoteNightShift', value);
                } else {
                    updatePatient(bedId, 'handoffNoteNightShift', value);
                }
            }
        }
    }, [isMedical, selectedShift, updatePatient, updatePatientMultiple, updateClinicalCrib, updateClinicalCribMultiple]);

    const handleShareLink = useCallback(() => {
        if (!record) return;
        const url = `${window.location.origin}?mode=signature&date=${record.date}`;
        navigator.clipboard.writeText(url);
        onSuccess('Enlace copiado', 'El link para firma médica ha sido copiado al portapapeles.');
    }, [record, onSuccess]);

    const handleSendWhatsApp = useCallback(async () => {
        if (!record) return;
        setWhatsappSending(true);
        try {
            const config = await getWhatsAppConfig();
            const templates = await getMessageTemplates();

            if (!config || !config.handoffNotifications?.targetGroupId) {
                throw new Error('WhatsApp no configurado. Configure el grupo destino en ajustes.');
            }

            const handoffTemplate = templates.find(t => t.type === 'handoff');
            if (!handoffTemplate) {
                throw new Error('No se encontró template de entrega médica');
            }

            await sendMedicalHandoff(handoffTemplate.content, config.handoffNotifications.targetGroupId);
            setWhatsappSent(true);
            onSuccess('Entrega enviada a WhatsApp correctamente');
        } catch (error: any) {
            console.error('Error sending WhatsApp:', error);
            onSuccess(error.message || 'Error al enviar a WhatsApp');
        } finally {
            setWhatsappSending(false);
        }
    }, [record, sendMedicalHandoff, onSuccess]);

    const handleSendWhatsAppManual = useCallback(async () => {
        if (!record) return;
        try {
            const templates = await getMessageTemplates();
            const handoffTemplate = templates.find(t => t.type === 'handoff');
            if (!handoffTemplate) {
                throw new Error('No se encontró template de entrega médica');
            }

            // Calculate Stats (Replica of server-side logic for consistency)
            const hospitalized = visibleBeds.filter(b =>
                record.beds[b.id].patientName && !record.beds[b.id].isBlocked
            ).length;
            const blockedBeds = visibleBeds.filter(b => record.beds[b.id].isBlocked).length;
            const freeBeds = visibleBeds.length - hospitalized - blockedBeds;

            const [year, month, day] = record.date.split('-');
            const dateStr = `${day}-${month}-${year}`;
            const handoffUrl = `${window.location.origin}?mode=signature&date=${dateStr}`;

            // Manual message construction with clean emojis to avoid encoding issues
            const message = `🏥 Hospital Hanga Roa\n` +
                `📋 Entrega de Turno Médico\n\n` +
                `📅 Fecha: ${dateStr}\n` +
                `👨‍⚕️ Entregado por: ${record.medicalHandoffDoctor || 'Sin especificar'}\n` +
                `🕐 Firmado: ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}\n\n` +
                `📊 Resumen:\n` +
                `• Hospitalizados: ${hospitalized} pacientes\n` +
                `• Camas libres: ${freeBeds}\n` +
                `• Nuevos ingresos: 0\n` +
                `• Altas: 0\n\n` +
                `🔗 Ver entrega completa:\n` +
                `${handoffUrl}\n\n` +
                `- Enviado manualmente por Sistema HHR`;

            const encodedMessage = encodeURIComponent(message);
            window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        } catch (error: any) {
            console.error('Error in manual WhatsApp:', error);
            onSuccess(error.message || 'Error al preparar WhatsApp');
        }
    }, [record, visibleBeds, onSuccess]);

    // ========== FORMATTING ==========
    const formatPrintDate = useCallback(() => {
        if (!record) return '';
        const [year, month, day] = record.date.split('-');
        return `${day}-${month}-${year}`;
    }, [record]);

    return {
        // State
        selectedShift,
        setSelectedShift,
        whatsappSending,
        whatsappSent,

        // Computed
        isMedical,
        visibleBeds,
        hasAnyPatients,
        schedule,
        noteField,
        deliversList,
        receivesList,
        tensList,

        // Handlers
        handleNursingNoteChange,
        handleShareLink,
        handleSendWhatsApp,
        handleSendWhatsAppManual,
        formatPrintDate,
    };
};
