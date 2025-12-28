import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    signIn,
    signOut,
    signInAnonymouslyForPassport,
    hasActiveFirebaseSession,
    signInWithGoogle,
    isCurrentUserAllowed
} from '../../services/auth/authService';
import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    signInAnonymously
} from 'firebase/auth';
import { getDocs } from 'firebase/firestore';
import { auth } from '../../firebaseConfig';

// Mock specific firebase modules that setup.ts might have already mocked
vi.mock('firebase/auth', async () => {
    const actual = await vi.importActual('firebase/auth');
    return {
        ...actual,
        signInWithEmailAndPassword: vi.fn(),
        signInWithPopup: vi.fn().mockResolvedValue({ user: { uid: 'google-123', email: 'google@test.cl' } }),
        signOut: vi.fn(),
        onAuthStateChanged: vi.fn(),
        GoogleAuthProvider: class {
            setCustomParameters = vi.fn();
        },
        signInAnonymously: vi.fn()
    };
});

vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore');
    return {
        ...actual,
        getDocs: vi.fn(),
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn()
    };
});

describe('authService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('signIn', () => {
        it('should sign in successfully if email is whitelisted (static)', async () => {
            const mockFirebaseUser = {
                uid: '123',
                email: 'daniel.opazo@hospitalhangaroa.cl',
                displayName: 'Daniel'
            };

            vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
                user: mockFirebaseUser
            } as any);

            const result = await signIn('daniel.opazo@hospitalhangaroa.cl', 'password');

            expect(result.uid).toBe('123');
            expect(result.role).toBe('admin');
        });

        it('should sign in successfully if email is in Firestore', async () => {
            const mockFirebaseUser = {
                uid: '456',
                email: 'user@test.cl',
            };

            vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
                user: mockFirebaseUser
            } as any);

            vi.mocked(getDocs).mockResolvedValue({
                empty: false,
                docs: [{
                    data: () => ({ role: 'nurse' })
                }]
            } as any);

            const result = await signIn('user@test.cl', 'password');

            expect(result.uid).toBe('456');
            expect(result.role).toBe('nurse');
        });

        it('should throw error and sign out if email is not whitelisted', async () => {
            const mockFirebaseUser = {
                uid: '789',
                email: 'stranger@gmail.com',
            };

            vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
                user: mockFirebaseUser
            } as any);

            vi.mocked(getDocs).mockResolvedValue({
                empty: true
            } as any);

            await expect(signIn('stranger@gmail.com', 'password'))
                .rejects.toThrow('Acceso no autorizado');

            expect(firebaseSignOut).toHaveBeenCalled();
        });

        it('should handle Firebase auth errors with friendly messages', async () => {
            vi.mocked(signInWithEmailAndPassword).mockRejectedValue({
                code: 'auth/wrong-password'
            });

            await expect(signIn('test@test.cl', 'wrong'))
                .rejects.toThrow('Contraseña incorrecta');
        });
    });

    describe('signOut', () => {
        it('should call firebase signOut', async () => {
            await signOut();
            expect(firebaseSignOut).toHaveBeenCalled();
        });
    });

    describe('signInWithGoogle', () => {
        it('should sign in with Google successfully if whitelisted', async () => {
            // Mock Google user
            const mockGoogleUser = {
                uid: 'google-123',
                email: 'daniel.opazo@hospitalhangaroa.cl', // whitelisted static
                displayName: 'Google User'
            };

            // Note: signInWithPopup is mocked at the top level
            const { signInWithPopup } = await import('firebase/auth');
            vi.mocked(signInWithPopup).mockResolvedValue({
                user: mockGoogleUser
            } as any);

            const result = await signInWithGoogle();
            expect(result.uid).toBe('google-123');
            expect(result.role).toBe('admin');
        });

        it('should handle Google popup closing error', async () => {
            const { signInWithPopup } = await import('firebase/auth');
            vi.mocked(signInWithPopup).mockRejectedValue({
                code: 'auth/popup-closed-by-user'
            });

            await expect(signInWithGoogle()).rejects.toThrow('Inicio de sesión cancelado');
        });
    });

    describe('isCurrentUserAllowed', () => {
        it('should return true if current user is whitelisted', async () => {
            vi.spyOn(auth, 'currentUser', 'get').mockReturnValue({
                email: 'daniel.opazo@hospitalhangaroa.cl'
            } as any);

            const result = await isCurrentUserAllowed();
            expect(result).toBe(true);
        });

        it('should return false if no current user', async () => {
            vi.spyOn(auth, 'currentUser', 'get').mockReturnValue(null);

            const result = await isCurrentUserAllowed();
            expect(result).toBe(false);
        });
    });

    describe('signInAnonymouslyForPassport', () => {
        it('should sign in anonymously if no user is present', async () => {
            // Force currentUser to be null
            vi.spyOn(auth, 'currentUser', 'get').mockReturnValue(null);

            vi.mocked(signInAnonymously).mockResolvedValue({
                user: { uid: 'anon-123' }
            } as any);

            const uid = await signInAnonymouslyForPassport();
            expect(uid).toBe('anon-123');
            expect(signInAnonymously).toHaveBeenCalled();
        });

        it('should return existing uid if already signed in', async () => {
            vi.spyOn(auth, 'currentUser', 'get').mockReturnValue({ uid: 'existing-123' } as any);

            const uid = await signInAnonymouslyForPassport();
            expect(uid).toBe('existing-123');
            expect(signInAnonymously).not.toHaveBeenCalled();
        });
    });

    describe('hasActiveFirebaseSession', () => {
        it('should return true if currentUser exists', () => {
            vi.spyOn(auth, 'currentUser', 'get').mockReturnValue({ uid: '123' } as any);
            expect(hasActiveFirebaseSession()).toBe(true);
        });

        it('should return false if currentUser is null', () => {
            vi.spyOn(auth, 'currentUser', 'get').mockReturnValue(null);
            expect(hasActiveFirebaseSession()).toBe(false);
        });
    });
});
