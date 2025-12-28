import { useState, useEffect, useCallback } from 'react';
import { onAuthChange, signOut, AuthUser, hasActiveFirebaseSession, signInAnonymouslyForPassport } from '../services/auth/authService';
import {
    getStoredPassport,
    validatePassport,
    clearStoredPassport,
    isEligibleForPassport,
    downloadPassport
} from '../services/auth/passportService';

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
 * 
 * @example
 * ```tsx
 * const { user, authLoading, role, canEdit, handleLogout } = useAuthState();
 * 
 * if (authLoading) return <Loading />;
 * if (!user) return <LoginPage />;
 * 
 * return <App canEdit={canEdit} userRole={role} />;
 * ```
 */
export const useAuthState = (): UseAuthStateReturn => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [isOnline, setIsOnline] = useState(window.navigator.onLine);

    // Network status listeners
    useEffect(() => {
        const handleOnline = () => {
            console.log('[useAuthState] Network is ONLINE');
            setIsOnline(true);

            // If we were in offline mode with a passport, try to upgrade to hybrid mode
            const storedUser = localStorage.getItem('hhr_offline_user');
            if (storedUser) {
                console.log('[useAuthState] Attempting proactive re-auth for passport user...');
                signInAnonymouslyForPassport().catch((err: any) =>
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

                    // Validate the stored passport is still valid
                    const passport = getStoredPassport();
                    if (passport) {
                        const result = await validatePassport(passport);
                        if (result.valid) {
                            setUser(offlineUser);
                            setIsOfflineMode(true);
                            setAuthLoading(false);
                            return true;
                        } else {
                            // Passport expired or invalid, clear it
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
            // First check for offline user
            const hasOfflineUser = await checkOfflineUser();

            // Then listen to Firebase auth
            const unsubscribe = onAuthChange(async (authUser) => {
                if (authUser) {
                    // Check if this is an anonymous user (from passport hybrid auth)
                    // If anonymous, keep using the passport user data instead
                    const isAnonymousUser = authUser.email === null;

                    if (isAnonymousUser) {
                        // This is anonymous auth from passport hybrid mode
                        // Try to restore the passport user to get their role
                        const storedUser = localStorage.getItem('hhr_offline_user');
                        if (storedUser) {
                            const passportUser = JSON.parse(storedUser) as AuthUser;
                            setUser(passportUser);
                            setIsOfflineMode(false); // We're connected to Firebase (anonymous)
                        } else {
                            // No stored passport user, use the anonymous user
                            setUser(authUser);
                            setIsOfflineMode(false);
                        }
                    } else {
                        // Regular Firebase user (with email)
                        setUser(authUser);
                        setIsOfflineMode(false);
                        // Clear stored offline data since we have a real session
                        localStorage.removeItem('hhr_offline_user');
                    }
                } else {
                    // No Firebase user - check offline again
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

    // Firebase connection status tracks auth status (including anonymous auth from passport)
    // We use an interval because anonymous auth happens asynchronously after passport login
    useEffect(() => {
        const checkConnection = () => {
            const hasSession = hasActiveFirebaseSession();
            // Connected if we have a session AND we are technically online
            setIsFirebaseConnected(isOnline && (hasSession || (!!user && !isOfflineMode)));
        };

        // Initial check
        checkConnection();

        // Poll every 1 second for the first 10 seconds after mount/change
        // This catches the async anonymous auth completion
        const interval = setInterval(checkConnection, 1000);
        const timeout = setTimeout(() => clearInterval(interval), 10000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [user, isOfflineMode]);

    const handleLogout = async () => {
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
    };

    // Download passport for eligible users
    const handleDownloadPassport = useCallback(async (password: string) => {
        if (!user) return false;
        return await downloadPassport(user, password);
    }, [user]);

    // Derive role from user object (set by authService or passport)
    const role: UserRole = (user?.role as UserRole) || 'viewer';
    // Editor roles include: admin, editor, nurse_hospital (from passport)
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
