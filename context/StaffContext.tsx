/**
 * StaffContext
 * Manages state for nursing and TENS staff assignment.
 * Extracted from CensusActionsContext to follow single responsibility principle.
 */

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CatalogRepository } from '../services/repositories/DailyRecordRepository';

// ============================================================================
// Types
// ============================================================================

interface StaffContextType {
    // Nurse catalog (available names)
    nursesList: string[];
    setNursesList: (nurses: string[]) => void;

    // TENS catalog (available names)
    tensList: string[];
    setTensList: (tens: string[]) => void;

    // Manager modal visibility
    showNurseManager: boolean;
    setShowNurseManager: (show: boolean) => void;
    showTensManager: boolean;
    setShowTensManager: (show: boolean) => void;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface StaffProviderProps {
    children: ReactNode;
}

export const StaffProvider: React.FC<StaffProviderProps> = ({ children }) => {
    // Nurse catalog state
    const [nursesList, setNursesList] = useState<string[]>([]);
    // TENS catalog state
    const [tensList, setTensList] = useState<string[]>([]);

    // Manager modal visibility
    const [showNurseManager, setShowNurseManager] = useState(false);
    const [showTensManager, setShowTensManager] = useState(false);

    // Subscribe to catalogs (unified through CatalogRepository)
    useEffect(() => {
        let unsubscribeNurses: (() => void) | null = null;
        let unsubscribeTens: (() => void) | null = null;
        let unsubscribeAuth: (() => void) | null = null;

        const setupSubscriptions = async () => {
            // Load initial from Local/IndexedDB first (fast)
            const [nurses, tens] = await Promise.all([
                CatalogRepository.getNurses(),
                CatalogRepository.getTens()
            ]);
            setNursesList(nurses);
            setTensList(tens);

            // Import auth dynamically
            const { auth } = await import('../firebaseConfig');

            unsubscribeAuth = auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('[StaffContext] 👤 Auth ready, subscribing to catalogs');

                    // Cleanup previous if exists
                    if (unsubscribeNurses) unsubscribeNurses();
                    if (unsubscribeTens) unsubscribeTens();

                    unsubscribeNurses = CatalogRepository.subscribeNurses(setNursesList);
                    unsubscribeTens = CatalogRepository.subscribeTens(setTensList);
                }
            });
        };

        setupSubscriptions();

        return () => {
            console.log('[StaffContext] 🧹 Cleaning up all subscriptions');
            if (unsubscribeAuth) unsubscribeAuth();
            if (unsubscribeNurses) unsubscribeNurses();
            if (unsubscribeTens) unsubscribeTens();
        };
    }, []);


    const value: StaffContextType = {
        nursesList,
        setNursesList,
        tensList,
        setTensList,
        showNurseManager,
        setShowNurseManager,
        showTensManager,
        setShowTensManager
    };

    return (
        <StaffContext.Provider value={value}>
            {children}
        </StaffContext.Provider>
    );
};

// ============================================================================
// Hook
// ============================================================================

export const useStaffContext = () => {
    const context = useContext(StaffContext);
    if (!context) {
        throw new Error('useStaffContext must be used within a StaffProvider');
    }
    return context;
};
