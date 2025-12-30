/**
 * Integration Test Setup
 * Provides test utilities and mock providers for integration testing.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { DailyRecord, PatientData, Specialty, PatientStatus } from '@/types';
import { DailyRecordContextType, useDailyRecord } from '@/hooks/useDailyRecord';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from '@/context/UIContext';
import { AuditProvider } from '@/context/AuditContext';
import { DemoModeProvider } from '@/context/DemoModeContext';
import { AuthProvider } from '@/context/AuthContext';
import { DailyRecordProvider } from '@/context/DailyRecordContext';

// ============================================================================
// Mock Data Factories
// ============================================================================

export const createMockPatient = (overrides: Partial<PatientData> = {}): PatientData => ({
    patientName: '',
    rut: '',
    age: '',
    pathology: '',
    admissionDate: '',
    bedId: '',
    specialty: Specialty.MEDICINA,
    status: PatientStatus.ESTABLE,
    devices: [],
    hasWristband: true,
    surgicalComplication: false,
    isUPC: false,
    isBlocked: false,
    blockedReason: '',
    bedMode: 'Cama',
    hasCompanionCrib: false,
    cudyr: {
        changeClothes: 0, mobilization: 0, feeding: 0, elimination: 0,
        psychosocial: 0, surveillance: 0, vitalSigns: 0, fluidBalance: 0,
        oxygenTherapy: 0, airway: 0, proInterventions: 0, skinCare: 0,
        pharmacology: 0, invasiveElements: 0
    },
    ...overrides
});

export const createMockRecord = (date: string, overrides: Partial<DailyRecord> = {}): DailyRecord => ({
    date,
    beds: {},
    discharges: [],
    transfers: [],
    cma: [],
    nurses: ['', '', '', ''],
    activeExtraBeds: [],
    lastUpdated: new Date().toISOString(),
    ...overrides
});

// ============================================================================
// Mock DailyRecordContext Value
// ============================================================================

export const createMockDailyRecordContext = (
    record: DailyRecord = createMockRecord('2024-12-11')
): DailyRecordContextType => ({
    record,
    syncStatus: 'idle',
    lastSyncTime: null,
    createDay: vi.fn(),
    generateDemo: vi.fn(),
    refresh: vi.fn(),
    updatePatient: vi.fn(),
    updatePatientMultiple: vi.fn(),
    updateClinicalCrib: vi.fn(),
    updateClinicalCribMultiple: vi.fn(),
    updateCudyr: vi.fn(),
    clearPatient: vi.fn(),
    clearAllBeds: vi.fn(),
    moveOrCopyPatient: vi.fn(),
    toggleBlockBed: vi.fn(),
    updateBlockedReason: vi.fn(),
    toggleExtraBed: vi.fn(),
    updateNurse: vi.fn(),
    updateTens: vi.fn(),
    addDischarge: vi.fn(),
    updateDischarge: vi.fn(),
    deleteDischarge: vi.fn(),
    undoDischarge: vi.fn(),
    addTransfer: vi.fn(),
    updateTransfer: vi.fn(),
    deleteTransfer: vi.fn(),
    undoTransfer: vi.fn(),
    addCMA: vi.fn(),
    deleteCMA: vi.fn(),
    updateCMA: vi.fn(),
    resetDay: vi.fn(),
    updateHandoffChecklist: vi.fn(),
    updateHandoffNovedades: vi.fn(),
    updateHandoffStaff: vi.fn(),
    updateMedicalSignature: vi.fn(),
    updateMedicalHandoffDoctor: vi.fn().mockResolvedValue(undefined),
    markMedicalHandoffAsSent: vi.fn().mockResolvedValue(undefined),
    sendMedicalHandoff: vi.fn().mockResolvedValue(undefined),
});

// ============================================================================
// Test Wrapper with All Providers
// ============================================================================

interface AllProvidersProps {
    children: React.ReactNode;
    contextValue?: DailyRecordContextType;
}

const AllProviders: React.FC<AllProvidersProps> = ({ children, contextValue }) => {
    const mockContext = contextValue || createMockDailyRecordContext();
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
        },
    });

    return (
        <QueryClientProvider client={queryClient}>
            <UIProvider>
                <AuthProvider>
                    <AuditProvider userId="test-user">
                        <DemoModeProvider>
                            <DailyRecordProvider value={mockContext}>
                                {children}
                            </DailyRecordProvider>
                        </DemoModeProvider>
                    </AuditProvider>
                </AuthProvider>
            </UIProvider>
        </QueryClientProvider>
    );
};

// ============================================================================
// Custom Render with Providers
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    contextValue?: DailyRecordContextType;
}

const customRender = (
    ui: ReactElement,
    options: CustomRenderOptions = {}
) => {
    const { contextValue, ...renderOptions } = options;

    return render(ui, {
        wrapper: ({ children }) => (
            <AllProviders contextValue={contextValue}>{children}</AllProviders>
        ),
        ...renderOptions
    });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
