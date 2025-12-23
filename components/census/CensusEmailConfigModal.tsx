import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Trash2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { buildCensusEmailBody } from '../../constants/email';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    recipients: string[];
    onRecipientsChange: (recipients: string[]) => void;
    message: string;
    onMessageChange: (message: string) => void;
    onResetMessage?: () => void;
    date: string;
    nursesSignature?: string;
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const CensusEmailConfigModal: React.FC<Props> = ({
    isOpen,
    onClose,
    recipients,
    onRecipientsChange,
    message,
    onMessageChange,
    onResetMessage,
    date,
    nursesSignature
}) => {
    const [newRecipient, setNewRecipient] = useState('');
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const defaultMessage = useMemo(() => buildCensusEmailBody(date, nursesSignature), [date, nursesSignature]);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setNewRecipient('');
            setIsBulkEditing(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isBulkEditing) {
            setBulkText(recipients.join('\n'));
            setError(null);
        }
    }, [isBulkEditing, recipients]);

    if (!isOpen) return null;

    const handleAddRecipient = () => {
        const trimmed = newRecipient.trim();
        if (!trimmed) return;

        if (!isValidEmail(trimmed)) {
            setError('Ingresa un correo válido.');
            return;
        }

        if (recipients.includes(trimmed)) {
            setError('Ese destinatario ya está agregado.');
            return;
        }

        onRecipientsChange([...recipients, trimmed]);
        setNewRecipient('');
        setError(null);
    };

    const handleBulkApply = () => {
        const entries = bulkText
            .split(/[\n,]+/)
            .map((entry) => entry.trim())
            .filter(Boolean);

        const invalid = entries.filter((email) => !isValidEmail(email));
        if (invalid.length > 0) {
            setError(`Los siguientes correos no son válidos: ${invalid.join(', ')}`);
            return;
        }

        const uniqueRecipients = Array.from(new Set(entries));
        onRecipientsChange(uniqueRecipients);
        setIsBulkEditing(false);
        setError(null);
    };

    const handleRecipientChange = (index: number, value: string) => {
        const updated = [...recipients];
        updated[index] = value;
        onRecipientsChange(updated);
    };

    const handleRemoveRecipient = (index: number) => {
        const updated = recipients.filter((_, i) => i !== index);
        onRecipientsChange(updated);
    };

    const handleResetMessage = () => {
        if (onResetMessage) {
            onResetMessage();
        } else {
            onMessageChange(defaultMessage);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-5 outline-none"
                aria-modal="true"
                role="dialog"
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Configuración del envío de correo</h2>
                        <p className="text-sm text-slate-500">Personaliza destinatarios y el mensaje antes de enviar el censo.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-6">
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-slate-700">Destinatarios</h3>
                            <button
                                onClick={() => setIsBulkEditing((prev) => !prev)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50"
                            >
                                {isBulkEditing ? 'Volver a vista individual' : 'Edición masiva'}
                            </button>
                        </div>
                        {isBulkEditing ? (
                            <div className="space-y-2">
                                <textarea
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    rows={6}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Pega correos separados por coma o por línea"
                                />
                                <p className="text-xs text-slate-500">
                                    Puedes importar y exportar la lista pegando correos separados por comas o saltos de línea. Las entradas duplicadas se eliminarán automáticamente.
                                </p>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => setIsBulkEditing(false)}
                                        className="px-3.5 py-1.5 rounded-md border border-slate-200 text-slate-700 text-sm hover:bg-slate-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleBulkApply}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold"
                                    >
                                        Guardar lista
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {recipients.length === 0 && (
                                    <p className="text-xs text-slate-500 w-full">No hay destinatarios configurados. Agrega los correos a los que deseas enviar el censo.</p>
                                )}
                                {recipients.map((email, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full"
                                    >
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => handleRecipientChange(index, e.target.value)}
                                            className="flex-1 min-w-[280px] sm:min-w-[360px] border border-slate-200 rounded-lg px-3 py-2 text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        />
                                        <button
                                            onClick={() => handleRemoveRecipient(index)}
                                            className="p-1.5 text-red-600 hover:text-red-700"
                                            aria-label="Eliminar destinatario"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2 mt-2 w-full flex-wrap">
                                    <input
                                        type="email"
                                        placeholder="nuevo@correo.cl"
                                        value={newRecipient}
                                        onChange={(e) => setNewRecipient(e.target.value)}
                                        className="flex-1 min-w-[280px] sm:min-w-[360px] border border-slate-200 rounded-lg px-3 py-2 text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={handleAddRecipient}
                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                                    >
                                        <Plus size={12} /> Agregar
                                    </button>
                                </div>
                            </div>
                        )}
                        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700">Mensaje</h3>
                                <p className="text-xs text-slate-500">Puedes editar el texto. La firma sugerida se completa con el turno de noche del día seleccionado.</p>
                            </div>
                            <button
                                onClick={handleResetMessage}
                                className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 font-semibold"
                                title="Restablecer mensaje predeterminado"
                            >
                                <RefreshCw size={12} /> Restablecer
                            </button>
                        </div>
                        <textarea
                            value={message}
                            onChange={(e) => onMessageChange(e.target.value)}
                            rows={5}
                            className={clsx(
                                'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                                'border-slate-200'
                            )}
                        />
                    </section>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="px-3.5 py-1.5 rounded-md border border-slate-200 text-slate-700 text-sm hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

