import React, { useState } from 'react';
import { Lock, BedDouble, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { BEDS } from '../../constants';
import { useDailyRecordContext } from '../../context/DailyRecordContext';
import { BaseModal, ModalSection } from '../shared/BaseModal';
import { BedBlockSchema } from '../../schemas/inputSchemas';
import { useScrollLock } from '../../hooks/useScrollLock';

interface BedManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BedManagerModal: React.FC<BedManagerModalProps> = ({
  isOpen, onClose
}) => {
  const { record, toggleBlockBed, updateBlockedReason, toggleExtraBed } = useDailyRecordContext();
  const [blockingBedId, setBlockingBedId] = useState<string | null>(null);
  const [editingBedId, setEditingBedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!record) return null;

  // Lock scroll when SubDialog is open
  const isSubDialogOpen = blockingBedId !== null || editingBedId !== null;
  useScrollLock(isSubDialogOpen);

  const handleBedClick = (bedId: string, isBlocked: boolean) => {
    setError(null);
    if (isBlocked) {
      setEditingBedId(bedId);
      setReason(record.beds[bedId].blockedReason || '');
    } else {
      setBlockingBedId(bedId);
      setReason('');
    }
  };

  const handleUnblock = () => {
    if (editingBedId) {
      toggleBlockBed(editingBedId);
      setEditingBedId(null);
      setReason('');
      setError(null);
    }
  };

  const validateReason = () => {
    const result = BedBlockSchema.safeParse({ reason });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return false;
    }
    setError(null);
    return true;
  };

  const handleSaveReason = () => {
    if (editingBedId && validateReason()) {
      updateBlockedReason(editingBedId, reason);
      setEditingBedId(null);
      setReason('');
    }
  };

  const confirmBlock = () => {
    if (blockingBedId && validateReason()) {
      toggleBlockBed(blockingBedId, reason);
      setBlockingBedId(null);
      setReason('');
    }
  };

  const cancelBlock = () => {
    setBlockingBedId(null);
    setReason('');
    setError(null);
  };

  // Sub-dialog component for blocking/editing
  const SubDialog = ({
    title,
    onConfirm,
    onCancel,
    confirmText,
    confirmClass,
    showUnblock = false
  }: {
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText: string;
    confirmClass: string;
    showUnblock?: boolean;
  }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white border border-slate-300 shadow-2xl p-4 rounded-xl w-full max-w-sm animate-scale-in">
        <h4 className="font-semibold text-slate-800 mb-3 text-base text-center">{title}</h4>

        <div className="mb-3">
          <label className="text-[11px] font-semibold text-slate-500 uppercase mb-2 block">Motivo del Bloqueo</label>
          <input
            autoFocus
            type="text"
            className={clsx(
              "w-full p-2.5 border rounded-lg focus:ring-2 focus:outline-none text-slate-700 text-sm transition-all",
              error ? "border-red-500 focus:ring-red-200" : "border-slate-300 focus:ring-medical-500 focus:border-medical-500"
            )}
            placeholder="Ej: Mantención, Aislamiento, Daño..."
            value={reason}
            onChange={e => { setReason(e.target.value); setError(null); }}
            onKeyDown={e => e.key === 'Enter' && onConfirm()}
          />
          {error && <p className="text-[10px] text-red-500 mt-1 font-medium animate-fade-in">{error}</p>}
        </div>

        <div className="flex gap-2">
          {showUnblock && (
            <button
              onClick={handleUnblock}
              className="flex-1 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors border border-red-200"
            >
              Desbloquear
            </button>
          )}
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors border border-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={clsx("flex-1 py-2 text-white rounded-md text-sm font-semibold transition-colors", confirmClass)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Bloqueo de Camas"
        icon={<Lock size={18} />}
        size="xl"
        headerIconColor="text-amber-600"
      >
        {/* Section 1: Block Beds */}
        <ModalSection
          title="Bloquear Camas"
          icon={<Lock size={14} />}
          description="Marque las camas que están fuera de servicio."
          variant="warning"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BEDS.filter(b => !b.isExtra).map(bed => {
              const isBlocked = record.beds[bed.id]?.isBlocked;
              return (
                <button
                  key={bed.id}
                  onClick={() => handleBedClick(bed.id, isBlocked)}
                  className={clsx(
                    "p-2 rounded-lg border text-xs font-semibold transition-all flex justify-between items-center",
                    isBlocked
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-medical-300"
                  )}
                  disabled={blockingBedId !== null || editingBedId !== null}
                >
                  <span>{bed.name}</span>
                  {isBlocked ? <Lock size={14} /> : <div className="w-4" />}
                </button>
              )
            })}
          </div>
        </ModalSection>

        {/* Section 2: Extra Beds */}
        <ModalSection
          title="Habilitar Camas Extras"
          icon={<BedDouble size={14} />}
          description="Active camas adicionales para este día (E1, E2, etc.)."
          variant="info"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BEDS.filter(b => b.isExtra).map(bed => {
              const isEnabled = (record.activeExtraBeds || []).includes(bed.id);
              return (
                <button
                  key={bed.id}
                  onClick={() => toggleExtraBed(bed.id)}
                  className={clsx(
                    "p-2.5 rounded-lg border-2 text-xs font-semibold transition-all flex justify-between items-center",
                    isEnabled
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-medical-300"
                  )}
                  disabled={blockingBedId !== null}
                >
                  <span>{bed.name}</span>
                  {isEnabled ? <CheckCircle size={16} /> : <div className="w-4" />}
                </button>
              )
            })}
          </div>
        </ModalSection>
      </BaseModal>

      {/* Sub-dialog for blocking reason */}
      {blockingBedId && (
        <SubDialog
          title={`Bloquear Cama ${blockingBedId}`}
          onConfirm={confirmBlock}
          onCancel={cancelBlock}
          confirmText="Confirmar"
          confirmClass="bg-red-600 hover:bg-red-700"
        />
      )}

      {/* Sub-dialog for editing blocked bed */}
      {editingBedId && (
        <SubDialog
          title={`Editar Cama ${editingBedId}`}
          onConfirm={handleSaveReason}
          onCancel={() => { setEditingBedId(null); setReason(''); }}
          confirmText="Guardar"
          confirmClass="bg-amber-500 hover:bg-amber-600"
          showUnblock
        />
      )}
    </>
  );
};
