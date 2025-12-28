import React, { useState, useRef, useCallback } from 'react';
import { signIn, signInWithGoogle, signInAnonymouslyForPassport } from '../../services/auth/authService';
import {
    parsePassportFile,
    validatePassport,
    storePassportLocally,
    getStoredPassport,
    verifyPassportCredentials
} from '../../services/auth/passportService';
import { Hospital, Lock, Mail, AlertCircle, Loader2, FileKey, Upload } from 'lucide-react';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

// Google Icon SVG Component
const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isPassportLoading, setIsPassportLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await signIn(email, password);
            onLoginSuccess();
        } catch (err: unknown) {
            const error = err as Error;

            // Try offline fallback if there's a stored passport
            const storedPassport = getStoredPassport();
            if (storedPassport) {
                console.log('[LoginPage] Attempting offline credential verification fallback...');
                const isValid = await verifyPassportCredentials(storedPassport, email, password);

                if (isValid) {
                    const result = await validatePassport(storedPassport);
                    if (result.valid) {
                        // Store user info in localStorage for offline mode
                        localStorage.setItem('hhr_offline_user', JSON.stringify(result.user));

                        // Try to sign in anonymously (hybrid mode) if possible
                        try {
                            await signInAnonymouslyForPassport();
                        } catch {
                            // Offline, ignore anonymous auth failure
                        }

                        onLoginSuccess();
                        return;
                    }
                }
            }

            setError(error.message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        setIsGoogleLoading(true);

        try {
            await signInWithGoogle();
            onLoginSuccess();
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || 'Error al iniciar sesión con Google');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    // ========== PASSPORT HANDLING ==========
    const handlePassportFile = useCallback(async (file: File) => {
        setError(null);
        setIsPassportLoading(true);

        try {
            const passport = await parsePassportFile(file);

            if (!passport) {
                setError('No se pudo leer el archivo pasaporte. Verifique que sea un archivo .hhr válido.');
                return;
            }

            const result = await validatePassport(passport);

            if (!result.valid) {
                setError(result.error || 'Pasaporte inválido.');
                return;
            }

            // Valid passport - store locally
            storePassportLocally(passport);

            // Store user info in localStorage for offline mode
            localStorage.setItem('hhr_offline_user', JSON.stringify(result.user));

            // Try to sign in anonymously to Firebase for Firestore access (hybrid mode)
            await signInAnonymouslyForPassport();

            onLoginSuccess();
        } catch (err) {
            console.error('[LoginPage] Passport error:', err);
            setError('Error al procesar el pasaporte.');
        } finally {
            setIsPassportLoading(false);
        }
    }, [onLoginSuccess]);



    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handlePassportFile(file);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.hhr')) {
            handlePassportFile(file);
        } else {
            setError('Por favor, suba un archivo .hhr válido.');
        }
    }, [handlePassportFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const isAnyLoading = isLoading || isGoogleLoading || isPassportLoading;

    return (
        <div className="min-h-screen bg-gradient-to-br from-medical-600 via-medical-700 to-medical-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-4">
                        <Hospital className="w-10 h-10 text-medical-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Hospital Hanga Roa</h1>
                    <p className="text-medical-200">Sistema de Registro de Enfermería</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Iniciar Sesión</h2>

                    {/* Passport Upload Zone */}
                    <div
                        className={`mb-6 border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer
                            ${isDragging
                                ? 'border-medical-500 bg-medical-50'
                                : 'border-slate-300 hover:border-medical-400 hover:bg-slate-50'
                            }
                            ${isPassportLoading ? 'opacity-50 pointer-events-none' : ''}
                        `}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".hhr"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <div className="flex flex-col items-center gap-2">
                            {isPassportLoading ? (
                                <Loader2 className="w-8 h-8 text-medical-500 animate-spin" />
                            ) : (
                                <FileKey className="w-8 h-8 text-medical-500" />
                            )}
                            <p className="text-sm text-slate-600 font-medium">
                                {isDragging ? 'Suelte el archivo aquí' : 'Acceso Offline con Pasaporte'}
                            </p>
                            <p className="text-xs text-slate-400">
                                Arrastre su archivo .hhr o haga clic para seleccionar
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-slate-500">o con conexión a internet</span>
                        </div>
                    </div>

                    {/* Google Sign In Button */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isAnyLoading}
                        className="w-full mb-4 bg-white hover:bg-gray-50 disabled:bg-gray-100 border-2 border-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                    >
                        {isGoogleLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Conectando...
                            </>
                        ) : (
                            <>
                                <GoogleIcon className="w-5 h-5" />
                                Continuar con Google
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-slate-500">o con correo</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Correo electrónico
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-medical-500 focus:outline-none transition-all"
                                    placeholder="enfermero@hospital.cl"
                                    required
                                    disabled={isAnyLoading}
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-medical-500 focus:outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                    disabled={isAnyLoading}
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-fade-in">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isAnyLoading}
                            className="w-full bg-medical-600 hover:bg-medical-700 disabled:bg-medical-400 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-medical-500/30 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Ingresando...
                                </>
                            ) : (
                                'Ingresar'
                            )}
                        </button>
                    </form>

                    {/* Footer Note */}
                    <p className="mt-6 text-center text-sm text-slate-500">
                        Contacte al administrador si no tiene acceso
                    </p>
                </div>

                {/* Version/Footer */}
                <p className="text-center text-medical-300 text-xs mt-6">
                    Sistema Estadístico v1.0 • Servicio de Salud Metropolitano
                </p>
            </div>
        </div>
    );
};
