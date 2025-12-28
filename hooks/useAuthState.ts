import { useState, useEffect, useCallback } from 'react';
import { onAuthChange, signOut, AuthUser, hasActiveFirebaseSession, signInAnonymouslyForPassport } from '../services/auth/authService';
import {
    getStoredPassport,
    validatePassport,
    clearStoredPassport,
    isEligibleForPassport,
    downloadPassport
} from '../services/auth/passportService';
import { logUserLogout, logUserLogin } from '../services/admin/auditService';

/**
 * Available user roles in the application.
 * Controls access to different modules and features.
 * 
 * - `viewer`: Read-only access to all data
 * - `editor`: Can modify patient data and daily records
 * - `admin`: Full access including system configuration
 * - `nurse_hospital`: Hospital nurse with edit permissions (from passport)
 * - `doctor_urgency`: Emergency doctor with limited edit access
 * - `viewer_census`: Can only view census data
 */
export type UserRole = 'viewer' | 'editor' | 'admin' | 'nurse_hospital' | 'doctor_urgency' | 'viewer_census';

/**
 * Return type for the useAuthState hook.
 * Provides user authentication state, role information, and auth actions.
 */
interface UseAuthStateReturn {
    /** Current authenticated user or null if not logged in */
    user: AuthUser | null;
    /** True while authentication state is being determined */
    authLoading: boolean;
    /** True if connected to Firebase (either real or anonymous auth) */
    isFirebaseConnected: boolean;
    /** Signs out the current user (clears Firebase and passport auth) */
    handleLogout: () => Promise<void>;

    // Role-based properties
    /** Current user's role */
    role: UserRole;
    /** True if user has edit permissions (editor, admin, or nurse_hospital) */
    isEditor: boolean;
    /** True if user only has view permissions */
    isViewer: boolean;
    /** Alias for isEditor - true if user can modify data */
    canEdit: boolean;

    // Offline passport properties
    /** True if using offline passport authentication (no Firebase) */
    isOfflineMode: boolean;
    /** True if current user can download an offline access passport */
    canDownloadPassport: boolean;
    /** Downloads an encrypted passport file for offline access */
    handleDownloadPassport: (password: string) => Promise<boolean>;
}

import { SESSION_TIMEOUT_MS, ACTIVITY_EVENTS } from '../constants/security';

/**
 * useAuthState Hook
 * 
 * Central hook for managing authentication state throughout the application.
 * Supports dual authentication modes:
 * 
 * 1. **Firebase Auth**: Standard email/password authentication with real-time sync
 * 2. **Offline Passport**: Encrypted token-based auth for offline/island access
 * 
 * The hook automatically detects stored passports on mount and validates them.
 * Firebase connection status is monitored to enable/disable sync features.
 * 
 * @returns Authentication state, user info, role flags, and auth actions
 */
export const useAuthState = (): UseAuthStateReturn => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [isOnline, setIsOnline] = useState(window.navigator.onLine);

    // ========================================================================
    // Authentication Actions
    // ========================================================================

    const handleLogout = useCallback(async (reason: 'manual' | 'automatic' = 'manual') => {
        // Log the logout event before clearing data
        if (user?.email) {
            await logUserLogout(user.email, reason);
        }

        // Clear offline data
        clearStoredPassport();
        localStorage.removeItem('hhr_offline_user');
        setIsOfflineMode(false);

        // Firebase sign out (may fail if offline, that's ok)
        try {
            await signOut();
        } catch (error) {
            console.warn('[useAuthState] Firebase signOut failed (probably offline):', error);
        }

        setUser(null);
    }, [user]);

    // ========================================================================
    // Inactivity Detection (MINSAL Requirement)
    // ========================================================================
    useEffect(() => {
        if (!user) return;

        let timeoutId: NodeJS.Timeout;

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                console.warn('[useAuthState] Logout due to inactivity');
                handleLogout('automatic');
            }, SESSION_TIMEOUT_MS);
        };

        // Add activity listeners
        ACTIVITY_EVENTS.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Initial timer start
        resetTimer();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            ACTIVITY_EVENTS.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [user, handleLogout]);

    // Network status listeners
    useEffect(() => {
        const handleOnline = () => {
            console.log('[useAuthState] Network is ONLINE');
            setIsOnline(true);
            const storedUser = localStorage.getItem('hhr_offline_user');
            if (storedUser) {
                signInAnonymouslyForPassport().catch((err: unknown) =>
                    console.warn('[useAuthState] Proactive re-auth failed:', err)
                );
            }
        };

        const handleOffline = () => {
            console.log('[useAuthState] Network is OFFLINE');
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Check for offline passport user on mount
    useEffect(() => {
        const checkOfflineUser = async () => {
            try {
                const storedUser = localStorage.getItem('hhr_offline_user');
                if (storedUser) {
                    const offlineUser = JSON.parse(storedUser) as AuthUser;
                    const passport = getStoredPassport();
                    if (passport) {
                        const result = await validatePassport(passport);
                        if (result.valid) {
                            setUser(offlineUser);
                            setIsOfflineMode(true);
                            setAuthLoading(false);
                            return true;
                        } else {
                            clearStoredPassport();
                            localStorage.removeItem('hhr_offline_user');
                        }
                    }
                }
            } catch (error) {
                console.error('[useAuthState] Error checking offline user:', error);
            }
            return false;
        };

        const initAuth = async () => {
            await checkOfflineUser();

            const unsubscribe = onAuthChange(async (authUser) => {
                if (authUser) {
                    const isAnonymousUser = authUser.email === null;
                    const email = authUser.email;

                    if (!isAnonymousUser && email) {
                        if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('hhr_logged_this_session')) {
                            logUserLogin(email);
                            sessionStorage.setItem('hhr_logged_this_session', 'true');
                        }
                    }

                    if (isAnonymousUser) {
                        const storedUser = localStorage.getItem('hhr_offline_user');
                        if (storedUser) {
                            const passportUser = JSON.parse(storedUser) as AuthUser;
                            setUser(passportUser);
                            setIsOfflineMode(false);
                        } else {
                            setUser(authUser);
                            setIsOfflineMode(false);
                        }
                    } else {
                        setUser(authUser);
                        setIsOfflineMode(false);
                        localStorage.removeItem('hhr_offline_user');
                    }
                } else {
                    await checkOfflineUser();
                    if (!localStorage.getItem('hhr_offline_user')) {
                        setUser(null);
                    }
                }
                setAuthLoading(false);
            });

            return unsubscribe;
        };

        let unsubscribe: (() => void) | undefined;
        initAuth().then(unsub => { unsubscribe = unsub; });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    useEffect(() => {
        const checkConnection = () => {
            const hasSession = hasActiveFirebaseSession();
            setIsFirebaseConnected(isOnline && (hasSession || (!!user && !isOfflineMode)));
        };

        checkConnection();
        const interval = setInterval(checkConnection, 1000);
        const timeout = setTimeout(() => clearInterval(interval), 10000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [user, isOfflineMode, isOnline]);

    const handleDownloadPassport = useCallback(async (password: string) => {
        if (!user) return false;
        return await downloadPassport(user, password);
    }, [user]);

    const role: UserRole = (user?.role as UserRole) || 'viewer';
    const isEditor = role === 'editor' || role === 'admin' || role === 'nurse_hospital';
    const isViewer = !isEditor;
    const canEdit = isEditor;
    const canDownloadPassport = isEligibleForPassport(user);

    return {
        user,
        authLoading,
        isFirebaseConnected,
        handleLogout,
        role,
        isEditor,
        isViewer,
        canEdit,
        isOfflineMode,
        canDownloadPassport,
        handleDownloadPassport,
    };
};
