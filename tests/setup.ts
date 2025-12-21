import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test case
afterEach(() => {
    cleanup();
});

// Mock Firebase to prevent initialization errors in tests
const firebaseMock = {
    auth: {},
    db: {},
    storage: {},
    firebaseReady: Promise.resolve({}),
    mountConfigWarning: () => { }
};

vi.mock('./firebaseConfig', () => firebaseMock);
vi.mock('@/firebaseConfig', () => firebaseMock);

// Mock auditService globally to prevent Firebase dependency chain execution
vi.mock('./services/admin/auditService', () => ({
    logAuditEvent: vi.fn(),
    logPatientAdmission: vi.fn(),
    logPatientDischarge: vi.fn(),
    logPatientTransfer: vi.fn(),
    logPatientCleared: vi.fn(),
    logDailyRecordDeleted: vi.fn(),
    logDailyRecordCreated: vi.fn(),
    getAuditLogs: vi.fn().mockResolvedValue([]),
    getAuditLogsForDate: vi.fn().mockResolvedValue([]),
    getLocalAuditLogs: vi.fn().mockReturnValue([]),
    AUDIT_ACTION_LABELS: {}
}));

vi.mock('@/services/admin/auditService', () => ({
    logAuditEvent: vi.fn(),
    logPatientAdmission: vi.fn(),
    logPatientDischarge: vi.fn(),
    logPatientTransfer: vi.fn(),
    logPatientCleared: vi.fn(),
    logDailyRecordDeleted: vi.fn(),
    logDailyRecordCreated: vi.fn(),
    getAuditLogs: vi.fn().mockResolvedValue([]),
    getAuditLogsForDate: vi.fn().mockResolvedValue([]),
    getLocalAuditLogs: vi.fn().mockReturnValue([]),
    AUDIT_ACTION_LABELS: {}
}));
