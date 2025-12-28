/**
 * Audit Service Types
 * Defines the structure for audit logging entries.
 */

export type AuditAction =
    | 'PATIENT_ADMITTED'
    | 'PATIENT_DISCHARGED'
    | 'PATIENT_TRANSFERRED'
    | 'PATIENT_MODIFIED'
    | 'PATIENT_CLEARED'
    | 'DAILY_RECORD_DELETED'
    | 'DAILY_RECORD_CREATED'
    | 'PATIENT_VIEWED'
    | 'NURSE_HANDOFF_MODIFIED'
    | 'MEDICAL_HANDOFF_MODIFIED'
    | 'HANDOFF_NOVEDADES_MODIFIED'
    | 'CUDYR_MODIFIED'
    | 'VIEW_CUDYR'
    | 'VIEW_NURSING_HANDOFF'
    | 'VIEW_MEDICAL_HANDOFF'
    | 'USER_LOGIN'
    | 'USER_LOGOUT';

export interface AuditLogEntry {
    id: string;
    timestamp: string;          // ISO 8601
    userId: string;             // email del usuario
    action: AuditAction;        // tipo de acción
    entityType: 'patient' | 'discharge' | 'transfer' | 'dailyRecord' | 'user';
    entityId: string;           // bedId, recordId, etc.
    details: Record<string, unknown>;  // datos específicos de la acción
    patientIdentifier?: string; // RUT enmascarado (ej: 12.345.***-K)
    recordDate?: string;        // fecha del registro afectado
    authors?: string;           // Identificación de autores reales (para cuentas compartidas)
}

/**
 * Mask a RUT for privacy (e.g., "12.345.678-9" -> "12.345.***-*")
 */
export const maskRut = (rut: string): string => {
    if (!rut || rut.length < 4) return '***';
    const parts = rut.split('-');
    if (parts.length === 2) {
        const body = parts[0];
        return body.slice(0, -3) + '***-*';
    }
    return rut.slice(0, -4) + '***';
};
