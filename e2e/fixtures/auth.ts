/**
 * E2E Test Fixtures
 * Provides authentication helpers for E2E tests.
 * Uses localStorage injection to mock authenticated users.
 */

import { test as base, expect } from '@playwright/test';

// Mock user data for different roles
export const MOCK_USERS = {
    editor: {
        uid: 'e2e-test-editor-uid',
        email: 'hospitalizados@hospitalhangaroa.cl',
        displayName: 'E2E Test Editor',
        role: 'nurse_hospital'
    },
    admin: {
        uid: 'e2e-test-admin-uid',
        email: 'daniel.opazo@hospitalhangaroa.cl',
        displayName: 'E2E Test Admin',
        role: 'admin'
    },
    viewer: {
        uid: 'e2e-test-viewer-uid',
        email: 'd.opazo.damiani@gmail.com',
        displayName: 'E2E Test Viewer',
        role: 'doctor_urgency'
    }
};

/**
 * Helper to inject authenticated user before page load
 */
export async function injectMockUser(page: any, role: 'editor' | 'admin' | 'viewer' = 'editor') {
    const mockUser = MOCK_USERS[role];

    await page.addInitScript((user: typeof mockUser) => {
        // --- Passport Generation Logic (Simplified from passportService.ts) ---
        const SIGNATURE_KEY = 'HHR-2024-OFFLINE-PASSPORT-SECRET-KEY';
        const PASSPORT_VERSION = 1;

        const issuedAt = new Date().toISOString();
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        const expiresAtStr = expiresAt.toISOString();

        const dataToSign = `${user.email}|${user.role}|${user.displayName}|${issuedAt}|${expiresAtStr}`;

        // Mock HMAC-like hash
        let hash = 0;
        const combined = dataToSign + SIGNATURE_KEY;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const hex = Math.abs(hash).toString(16).padStart(8, '0');
        const signature = `v${PASSPORT_VERSION}-${hex}-e2e-test`;

        const mockPassport = {
            email: user.email,
            role: user.role,
            displayName: user.displayName,
            issuedAt,
            expiresAt: expiresAtStr,
            signature
        };

        localStorage.setItem('hhr_offline_user', JSON.stringify(user));
        localStorage.setItem('hhr_offline_passport', JSON.stringify(mockPassport));
    }, mockUser);
}

/**
 * Helper to inject mock daily record data
 */
export async function injectMockData(page: any, date?: string, populateWithPatient: boolean = false) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    await page.addInitScript(({ dateStr, populate }: { dateStr: string, populate: boolean }) => {
        const STORAGE_KEY = 'hanga_roa_hospital_data';

        const mockRecord = {
            date: dateStr,
            beds: {},
            discharges: [],
            transfers: [],
            cma: [],
            lastUpdated: new Date().toISOString(),
            nurses: ["Dr. Sender", "Enf. A"],
            activeExtraBeds: []
        };

        // Correct Hospital Bed IDs
        const BEDS_IDS = [
            'R1', 'R2', 'R3', 'R4',
            'NEO1', 'NEO2',
            'H1C1', 'H1C2', 'H2C1', 'H2C2', 'H3C1', 'H3C2',
            'H4C1', 'H4C2', 'H5C1', 'H5C2', 'H6C1', 'H6C2',
            'E1', 'E2', 'E3', 'E4', 'E5'
        ];

        BEDS_IDS.forEach(id => {
            (mockRecord.beds as any)[id] = {
                id,
                bedId: id,
                patientName: (populate && id === 'R1') ? "MOCK PATIENT" : "",
                rut: (populate && id === 'R1') ? "12345678" : "",
                isBlocked: false,
                bedMode: 'Adulto',
                hasCompanionCrib: false,
                devices: [],
                status: 'Estable',
                pathology: (populate && id === 'R1') ? "MOCK DIAGNOSIS" : "",
                specialty: '',
                age: (populate && id === 'R1') ? "45" : "",
                admissionDate: dateStr,
                hasWristband: false,
                surgicalComplication: false,
                isUPC: false
            };
        });

        const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        records[dateStr] = mockRecord;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }, { dateStr: targetDate, populate: populateWithPatient });
}

/**
 * Helper to clear authentication
 */
export async function clearAuth(page: any) {
    await page.evaluate(() => {
        localStorage.removeItem('hhr_offline_user');
        localStorage.removeItem('hhr_offline_passport');
    });
}

export { expect };
