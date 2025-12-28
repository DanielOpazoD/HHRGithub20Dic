/**
 * SettingsModal Component
 * 
 * Application configuration modal using the BaseModal pattern.
 * Includes table config, offline passport, demo data, and test agent sections.
 */

import React, { useRef, useState } from 'react';
import { Settings, Database, Bot, FileKey, Download, TableProperties, Upload, RotateCcw, Lock, AlertCircle } from 'lucide-react';
import { BaseModal, ModalSection } from '../shared/BaseModal';
import { useTableConfig } from '../../context/TableConfigContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateDemo: () => void;
  onRunTest: () => void;
  canDownloadPassport?: boolean;
  onDownloadPassport?: (password: string) => Promise<boolean>;
  isOfflineMode?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onGenerateDemo,
  onRunTest,
  canDownloadPassport = false,
  onDownloadPassport,
  isOfflineMode = false
}) => {
  const { config, exportConfig, importConfig, resetToDefaults, isEditMode, setEditMode, updatePageMargin } = useTableConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Passport security states
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handlePassportDownload = async () => {
    if (!password) {
      setDownloadError('Debe ingresar su contraseña actual para proteger el pasaporte');
      return;
    }

    if (onDownloadPassport) {
      setIsVerifying(true);
      setDownloadError(null);
      try {
        const success = await onDownloadPassport(password);
        if (success) {
          onClose();
          setPassword('');
        } else {
          setDownloadError('Error al generar el pasaporte. Verifique sus permisos.');
        }
      } catch (err) {
        setDownloadError('Error inesperado al descargar.');
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importConfig(file);
        alert('Configuración importada correctamente');
      } catch {
        alert('Error al importar: archivo inválido');
      }
      e.target.value = '';
    }
  };

  const handleReset = () => {
    if (confirm('¿Está seguro de resetear la configuración de columnas a valores por defecto?')) {
      resetToDefaults();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración"
      icon={<Settings size={18} />}
      size="md"
    >
      {/* Table Configuration Section */}
      <ModalSection
        title="Configuración de Tabla"
        icon={<TableProperties size={16} />}
        description="Personalice el ancho de las columnas y márgenes de la tabla de Censo Diario."
      >
        {/* Page Margin Control */}
        <div className="mb-4 p-3 bg-slate-100/50 rounded-xl">
          <label className="text-xs font-bold text-slate-700 mb-2 block">
            Margen de Página: {config.pageMargin}px
          </label>
          <input
            type="range"
            min="0"
            max="64"
            step="4"
            value={config.pageMargin}
            onChange={(e) => updatePageMargin(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>Sin margen</span>
            <span>Máximo</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => { setEditMode(!isEditMode); onClose(); }}
            className={`w-full py-2 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${isEditMode
              ? 'bg-blue-500 text-white shadow-blue-500/20'
              : 'bg-slate-200 text-slate-700 shadow-slate-300/20 hover:bg-slate-300'
              }`}
          >
            <TableProperties size={16} />
            {isEditMode ? 'Desactivar Modo Edición' : 'Activar Modo Edición'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={exportConfig}
              className="flex-1 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-600/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Download size={14} />
              Exportar
            </button>
            <button
              onClick={handleImportClick}
              className="flex-1 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-600/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Upload size={14} />
              Importar
            </button>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw size={14} />
            Resetear a Valores por Defecto
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </ModalSection>

      {/* Passport Download Section - Only for eligible users */}
      {canDownloadPassport && !isOfflineMode && onDownloadPassport && (
        <ModalSection
          title="Acceso Offline (Pasaporte)"
          icon={<FileKey size={16} />}
          description={<>Descargue un archivo pasaporte que le permitirá acceder al sistema <strong>sin conexión a internet</strong>.<br /><span className="font-bold text-emerald-700">Válido por 3 años. Se requiere su contraseña para encriptar el acceso.</span></>}
          variant="success"
        >
          <div className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                placeholder="Confirme su contraseña actual"
                className="w-full pl-10 pr-4 py-2 bg-white/60 border border-emerald-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setDownloadError(null);
                }}
              />
            </div>

            {downloadError && (
              <div className="flex items-center gap-2 text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 italic">
                <AlertCircle size={12} className="flex-shrink-0" />
                {downloadError}
              </div>
            )}

            <button
              onClick={handlePassportDownload}
              disabled={isVerifying}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>Generando...</>
              ) : (
                <>
                  <Download size={16} />
                  Descargar Pasaporte Protegido
                </>
              )}
            </button>
          </div>
        </ModalSection>
      )}

      {/* Demo Data Section */}
      <ModalSection
        title="Datos de Prueba (Demo)"
        icon={<Database size={16} />}
        description={<>Rellena la tabla actual con pacientes ficticios. Útil para practicar o ver cómo funciona el sistema.<br /><span className="font-bold text-blue-700">Nota: Sobrescribirá los datos del día actual.</span></>}
        variant="info"
      >
        <button
          onClick={() => { onGenerateDemo(); onClose(); }}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          Generar Pacientes Demo
        </button>
      </ModalSection>

      {/* Test Agent Section */}
      <ModalSection
        title="Agente de Prueba (Auto-Test)"
        icon={<Bot size={16} />}
        description="Ejecuta un script automático que verifica la integridad del sistema, almacenamiento y cálculos matemáticos."
      >
        <button
          onClick={() => { onRunTest(); onClose(); }}
          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-600/20 active:scale-95"
        >
          Ejecutar Diagnóstico
        </button>
      </ModalSection>
    </BaseModal>
  );
};
