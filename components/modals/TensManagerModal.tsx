import React, { useState } from 'react';
import { Users, Plus, Trash2, Cloud, AlertCircle, Pencil, Check, X } from 'lucide-react';
import { saveTensCatalogToFirestore } from '../../services/storage/firestoreService';
import { BaseModal, ModalSection } from '../shared/BaseModal';
import { StaffNameSchema } from '../../schemas/inputSchemas';
import clsx from 'clsx';

interface TensManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    tensList: string[];
    setTensList: (list: string[]) => void;
}

export const TensManagerModal: React.FC<TensManagerModalProps> = ({ isOpen, onClose, tensList, setTensList }) => {
    const [newTensName, setNewTensName] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [editingName, setEditingName] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    const saveTens = async (updatedList: string[]) => {
        // Update local state first
        setTensList(updatedList);
        // Save to localStorage
        localStorage.setItem('hanga_roa_tens_list', JSON.stringify(updatedList));

        // Sync to Firebase
        setSyncing(true);
        setSyncError(null);
        try {
            await saveTensCatalogToFirestore(updatedList);
        } catch (error) {
            setSyncError('Error al sincronizar con la nube');
            console.error('Firebase sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    const handleAdd = async () => {
        const trimmed = newTensName.trim();
        const result = StaffNameSchema.safeParse(trimmed);

        if (!result.success) {
            setValidationError(result.error.issues[0].message);
            return;
        }

        setValidationError(null);
        const updated = [...tensList, trimmed];
        await saveTens(updated);
        setNewTensName('');
    };

    const handleRemove = async (name: string) => {
        const updated = tensList.filter(n => n !== name);
        await saveTens(updated);
    };

    const handleStartEdit = (name: string) => {
        setEditingName(name);
        setEditValue(name);
        setValidationError(null);
    };

    const handleUpdate = async () => {
        if (!editingName) return;
        const trimmed = editValue.trim();

        const result = StaffNameSchema.safeParse(trimmed);
        if (!result.success) {
            setValidationError(result.error.issues[0].message);
            return;
        }

        setValidationError(null);
        const updated = tensList.map(n => (n === editingName ? trimmed : n));
        await saveTens(updated);
        setEditingName(null);
        setEditValue('');
    };

    const handleCancelEdit = () => {
        setEditingName(null);
        setEditValue('');
        setValidationError(null);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <span className="flex items-center gap-2">
                    Gestionar TENS
                    {syncing && <Cloud size={14} className="text-blue-500 animate-pulse" />}
                </span>
            }
            icon={<Users size={18} />}
            size="md"
            headerIconColor="text-teal-600"
        >
            <ModalSection
                title="Lista de TENS"
                icon={<Users size={14} />}
                description="Agregue, edite o elimine personal TENS del catálogo."
                variant="info"
            >
                {syncError && (
                    <div className="mb-3 p-2 bg-amber-50 text-amber-700 text-xs rounded flex items-center gap-2">
                        <AlertCircle size={14} />
                        {syncError}
                    </div>
                )}

                {/* Add new TENS input */}
                <div className="space-y-2 mb-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className={clsx(
                                "flex-1 p-2 border rounded-xl focus:ring-2 focus:outline-none text-sm transition-all",
                                validationError && !editingName ? "border-red-500 focus:ring-red-200" : "border-slate-300 focus:ring-teal-500"
                            )}
                            placeholder="Nuevo nombre..."
                            value={newTensName}
                            onChange={(e) => { setNewTensName(e.target.value); setValidationError(null); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <button
                            onClick={handleAdd}
                            className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-xl transition-colors shadow-lg shadow-teal-600/20 active:scale-95 flex items-center justify-center"
                            disabled={syncing}
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    {validationError && !editingName && (
                        <p className="text-[10px] text-red-500 mt-1 font-medium animate-fade-in pl-1">{validationError}</p>
                    )}
                </div>

                {/* TENS list */}
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {tensList.map(tens => (
                        <div key={tens} className="flex justify-between items-center bg-white/40 p-2 rounded-xl border border-white/60 gap-3 group shadow-sm transition-all hover:bg-white/60">
                            {editingName === tens ? (
                                <>
                                    <div className="flex-1 space-y-1">
                                        <input
                                            className={clsx(
                                                "w-full p-2 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all",
                                                validationError && editingName === tens ? "border-red-500 focus:ring-red-200" : "border-slate-300 focus:ring-teal-500"
                                            )}
                                            value={editValue}
                                            onChange={(e) => { setEditValue(e.target.value); setValidationError(null); }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleUpdate();
                                                if (e.key === 'Escape') handleCancelEdit();
                                            }}
                                            disabled={syncing}
                                            autoFocus
                                        />
                                        {validationError && editingName === tens && (
                                            <p className="text-[10px] text-red-500 font-medium animate-fade-in pl-1">{validationError}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button
                                            onClick={handleUpdate}
                                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60 shadow-md shadow-emerald-500/10"
                                            disabled={syncing}
                                            title="Guardar cambios"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors shadow-md shadow-slate-300/10"
                                            disabled={syncing}
                                            title="Cancelar"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span className="text-sm font-medium text-slate-700 flex-1 pl-1">{tens}</span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleStartEdit(tens)}
                                            className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-all"
                                            disabled={syncing}
                                            title="Editar nombre"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleRemove(tens)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            disabled={syncing}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {tensList.length === 0 && (
                        <div className="text-center text-slate-400 text-sm py-8 italic bg-white/20 rounded-2xl border border-dashed border-slate-200">
                            No hay TENS registrados
                        </div>
                    )}
                </div>

                {/* Sync status footer */}
                <div className="mt-6 pt-3 border-t border-slate-200/50 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Cloud size={12} className="text-teal-400" />
                    Sincronizado con Firebase
                </div>
            </ModalSection>
        </BaseModal>
    );
};
