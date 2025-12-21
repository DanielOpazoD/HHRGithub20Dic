/**
 * useSignatureMode
 * Handles URL-based signature mode for medical handoffs
 */
import { useEffect, useMemo } from 'react';
import { signInAnonymously, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';

interface SignatureModeResult {
    isSignatureMode: boolean;
    signatureDate: string | null;
    currentDateString: string;
}

export function useSignatureMode(
    navDateString: string,
    user: User | null,
    authLoading: boolean
): SignatureModeResult {
    // Parse URL params
    const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
    const isSignatureMode = urlParams.get('mode') === 'signature';
    const signatureDate = urlParams.get('date');

    // Anonymous login for signature mode
    useEffect(() => {
        if (isSignatureMode && !user && !authLoading) {
            signInAnonymously(auth).catch((err) =>
                console.error("Anonymous auth failed", err)
            );
        }
    }, [isSignatureMode, user, authLoading]);

    // Determine effective date
    const currentDateString = (isSignatureMode && signatureDate)
        ? signatureDate
        : navDateString;

    return {
        isSignatureMode,
        signatureDate,
        currentDateString
    };
}
