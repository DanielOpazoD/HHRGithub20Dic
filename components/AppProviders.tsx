/**
 * AppProviders
 * Centralized context providers for the application.
 * Reduces nesting complexity in App.tsx.
 */

import React, { ReactNode } from 'react';
import { DailyRecordProvider, StaffProvider, AuditProvider } from '@/context';
import { TableConfigProvider } from '@/context/TableConfigContext';
import { DailyRecordContextType } from '@/hooks/useDailyRecordTypes';

interface AppProvidersProps {
    children: ReactNode;
    dailyRecordHook: DailyRecordContextType;
    userId: string;
}

/**
 * Wraps children with all necessary context providers.
 * Order matters for provider nesting.
 * 
 * @example
 * ```tsx
 * <AppProviders dailyRecordHook={dailyRecordHook} userId={userId}>
 *   <AppContent />
 * </AppProviders>
 * ```
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children, dailyRecordHook, userId }) => {
    return (
        <DailyRecordProvider value={dailyRecordHook}>
            <StaffProvider>
                <TableConfigProvider>
                    {children}
                </TableConfigProvider>
            </StaffProvider>
        </DailyRecordProvider>
    );
};
