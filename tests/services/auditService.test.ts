import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';

// Force unmock because it's globally mocked in setup.ts
vi.unmock('../../services/admin/auditService');

// Mock Firebase Config BEFORE importing the service
vi.mock('../../firebaseConfig', () => ({
    db: { type: 'mock-db' },
    auth: {
        currentUser: { email: 'tester@hospital.cl' }
    }
}));

// Mock Firestore
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn().mockResolvedValue(undefined),
    getDocs: vi.fn(),
    query: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    where: vi.fn(),
    Timestamp: {
        now: vi.fn(() => ({ toDate: () => new Date() }))
    }
}));

const mockSaveAuditLog = vi.fn();
const mockGetAuditLogs = vi.fn();

vi.mock('../../services/storage/indexedDBService', () => ({
    saveAuditLog: (log: any) => mockSaveAuditLog(log),
    getAuditLogs: (limit: number) => mockGetAuditLogs(limit),
    getAuditLogsForDate: vi.fn()
}));

// Now import the service
import {
    logAuditEvent,
    logPatientAdmission,
    getLocalAuditLogs
} from '../../services/admin/auditService';
import { AuditLogEntry } from '../../types/audit';

describe('AuditService', () => {
    const mockUserId = 'tester@hospital.cl';
    const mockPatientRut = '12345678-9';
    const mockDate = '2024-12-24';
    const STORAGE_KEY = 'hanga_roa_audit_logs';

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('sanity check: localStorage should work', () => {
        localStorage.setItem('test', 'value');
        expect(localStorage.getItem('test')).toBe('value');
    });

    it('should store audit logs via indexedDBService', async () => {
        await logPatientAdmission('BED_01', 'Juan Pérez', mockPatientRut, mockDate);

        expect(mockSaveAuditLog).toHaveBeenCalled();
        const call = mockSaveAuditLog.mock.calls[0][0];
        expect(call.action).toBe('PATIENT_ADMITTED');
        expect(call.patientIdentifier).toContain('***');
    });

    it('should retrieve audit logs via indexedDBService', async () => {
        const mockLogs = [{ id: '1', action: 'USER_LOGIN' }];
        mockGetAuditLogs.mockResolvedValue(mockLogs);

        const logs = await getLocalAuditLogs();
        expect(logs).toEqual(mockLogs);
        expect(mockGetAuditLogs).toHaveBeenCalledWith(1000);
    });

    it('should attempt saving to firestore', async () => {
        await logAuditEvent(mockUserId, 'USER_LOGIN', 'user', mockUserId, {});
        expect(firestore.setDoc).toHaveBeenCalled();
    });
});
