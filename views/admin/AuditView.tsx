import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    ClipboardList, Search, RefreshCw, Clock, User,
    FileText, Filter, Download, ChevronDown, ChevronRight,
    Calendar, AlertCircle, CheckCircle2, Trash2, LogIn, Eye, Activity, BarChart3,
    MapPin, CreditCard, LogOut, GitBranch, MessageSquare, Stethoscope, Info, X, Key
} from 'lucide-react';
import { getAuditLogs, AUDIT_ACTION_LABELS } from '../../services/admin/auditService';
import { AuditLogEntry, AuditAction } from '../../types/audit';
import { generateAuditWorkbook } from '../../services/exporters/auditWorkbook';
import { workbookToBuffer } from '../../services/exporters/excelUtils';
import { saveAs } from 'file-saver';
import clsx from 'clsx';

// Format ISO timestamp to readable format
const formatTimestamp = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

// Action Icon Mapping
const actionIcons: Record<AuditAction, React.ReactNode> = {
    'PATIENT_ADMITTED': <CheckCircle2 size={14} />,
    'PATIENT_DISCHARGED': <LogOut size={14} />,
    'PATIENT_TRANSFERRED': <GitBranch size={14} />,
    'PATIENT_MODIFIED': <Activity size={14} />,
    'PATIENT_CLEARED': <Trash2 size={14} />,
    'DAILY_RECORD_DELETED': <Trash2 size={14} />,
    'DAILY_RECORD_CREATED': <FileText size={14} />,
    'PATIENT_VIEWED': <Eye size={14} />,
    'NURSE_HANDOFF_MODIFIED': <MessageSquare size={14} />,
    'MEDICAL_HANDOFF_MODIFIED': <Stethoscope size={14} />,
    'HANDOFF_NOVEDADES_MODIFIED': <AlertCircle size={14} />,
    'CUDYR_MODIFIED': <BarChart3 size={14} />,
    'USER_LOGIN': <LogIn size={14} />,
    'USER_LOGOUT': <LogOut size={14} />,
    'VIEW_CUDYR': <Eye size={14} />,
    'VIEW_NURSING_HANDOFF': <Eye size={14} />,
    'VIEW_MEDICAL_HANDOFF': <Eye size={14} />
};



// Action color mapping - Enhanced with semantic shades
const actionColors: Record<AuditAction, string> = {
    'PATIENT_ADMITTED': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'PATIENT_DISCHARGED': 'bg-blue-50 text-blue-700 border-blue-100',
    'PATIENT_TRANSFERRED': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    'PATIENT_MODIFIED': 'bg-amber-50 text-amber-700 border-amber-100',
    'PATIENT_CLEARED': 'bg-slate-50 text-slate-700 border-slate-100',
    'DAILY_RECORD_DELETED': 'bg-rose-50 text-rose-700 border-rose-100',
    'DAILY_RECORD_CREATED': 'bg-cyan-50 text-cyan-700 border-cyan-100',
    'PATIENT_VIEWED': 'bg-teal-50 text-teal-700 border-teal-100',
    'NURSE_HANDOFF_MODIFIED': 'bg-purple-50 text-purple-700 border-purple-100',
    'MEDICAL_HANDOFF_MODIFIED': 'bg-sky-50 text-sky-700 border-sky-100',
    'HANDOFF_NOVEDADES_MODIFIED': 'bg-orange-50 text-orange-700 border-orange-100',
    'CUDYR_MODIFIED': 'bg-yellow-50 text-yellow-700 border-yellow-100',
    'USER_LOGIN': 'bg-violet-50 text-violet-700 border-violet-100',
    'USER_LOGOUT': 'bg-gray-50 text-gray-700 border-gray-100',
    'VIEW_CUDYR': 'bg-amber-50 text-amber-700 border-amber-100',
    'VIEW_NURSING_HANDOFF': 'bg-purple-50 text-purple-700 border-purple-100',
    'VIEW_MEDICAL_HANDOFF': 'bg-sky-50 text-sky-700 border-sky-100'
};

const renderHumanDetails = (log: AuditLogEntry) => {
    const details = log.details || {};
    switch (log.action) {
        case 'PATIENT_ADMITTED':
            return `Se ingresó al paciente ${details.patientName || 'ANÓNIMO'} en la cama ${details.bedId || log.entityId}.`;
        case 'PATIENT_DISCHARGED':
            return `Se dio el alta a ${details.patientName || 'ANÓNIMO'} con estado "${details.status || 'Egreso'}".`;
        case 'PATIENT_TRANSFERRED':
            return `Se trasladó a ${details.patientName || 'ANÓNIMO'} hacia ${details.destination || 'otro centro'}.`;
        case 'PATIENT_MODIFIED':
            return `Se actualizaron los datos clínicos del paciente ${details.patientName || ''}.`;
        case 'PATIENT_CLEARED':
            return `Se liberó la cama ${details.bedId || log.entityId} (Paciente: ${details.patientName || 'N/A'}).`;
        case 'DAILY_RECORD_CREATED':
            return `Se creó el registro clínico para el día ${log.entityId}.`;
        case 'DAILY_RECORD_DELETED':
            return `Se eliminó permanentemente el registro clínico del ${log.entityId}.`;
        case 'CUDYR_MODIFIED':
            return `Se actualizó la evaluación CUDYR (${details.field || 'valor'}): ${details.value || '0'}.`;
        case 'NURSE_HANDOFF_MODIFIED':
            return `Modificación de nota de enfermería (${details.shift === 'day' ? 'Día' : 'Noche'}).`;
        case 'MEDICAL_HANDOFF_MODIFIED':
            return `Se editó la evolución médica del paciente.`;
        case 'HANDOFF_NOVEDADES_MODIFIED':
            return `Se actualizó la sección de novedades generales (${details.shift || 'turno'}).`;
        case 'VIEW_CUDYR':
            return `El usuario visualizó la planilla de categorización CUDYR.`;
        case 'VIEW_NURSING_HANDOFF':
            return `Visualización de la entrega de turno de enfermería (${details.shift || 'turno'}).`;
        case 'VIEW_MEDICAL_HANDOFF':
            return `Visualización de la entrega de turno médica.`;
        default:
            return JSON.stringify(details).slice(0, 100) + '...';
    }
};

// ============================================================================
// Export Keys Panel - Shows passwords for census dates
// ============================================================================
const ExportKeysPanel: React.FC = () => {
    const [passwords, setPasswords] = useState<Array<{ date: string; password: string; source?: string; createdAt?: string }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPasswords = async () => {
            setLoading(true);
            try {
                // Fetch stored passwords from Firestore
                const { getStoredPasswords } = await import('../../services/security/exportPasswordService');
                const storedPasswords = await getStoredPasswords(60); // Last 60 passwords

                setPasswords(storedPasswords.map(p => ({
                    date: p.date,
                    password: p.password,
                    source: (p as any).source,
                    createdAt: p.createdAt
                })));
            } catch (error) {
                console.error('Failed to load passwords:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPasswords();
    }, []);

    const formatDateDisplay = (dateStr: string): string => {
        const [year, month, day] = dateStr.split('-');
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${day} ${monthNames[parseInt(month, 10) - 1]} ${year}`;
    };

    const copyToClipboard = (password: string) => {
        navigator.clipboard.writeText(password);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <RefreshCw size={32} className="animate-spin text-rose-500 mx-auto mb-4" />
                <p className="text-slate-400">Cargando claves de exportación...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-pink-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-200">
                        <Key className="text-white" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Claves de Exportación Excel</h3>
                        <p className="text-sm text-slate-500">
                            Registro permanente de contraseñas usadas en archivos exportados. Guardadas automáticamente en Firestore.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4">
                {passwords.length === 0 ? (
                    <div className="text-center py-12">
                        <Key size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-500 font-medium">No hay claves registradas aún</p>
                        <p className="text-slate-400 text-sm mt-1">Las claves se guardan automáticamente al enviar correos o descargar archivos Excel.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {passwords.map(({ date, password, source }) => (
                            <div
                                key={date}
                                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/30 transition-all group"
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-slate-400" />
                                        <span className="font-medium text-slate-700">{formatDateDisplay(date)}</span>
                                    </div>
                                    {source && (
                                        <span className={clsx(
                                            "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded w-fit",
                                            source === 'email' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                                        )}>
                                            {source === 'email' ? '📧 Correo' : '📥 Descarga'}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => copyToClipboard(password)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 transition-all font-mono text-sm font-bold text-rose-600 group-hover:shadow-sm"
                                    title="Clic para copiar"
                                >
                                    {password}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-emerald-50/50">
                <div className="flex items-center gap-2 text-emerald-700 text-xs font-medium">
                    <CheckCircle2 size={14} />
                    <span>Las claves se guardan permanentemente en Firestore. Si necesita una clave antigua, siempre estará disponible aquí.</span>
                </div>
            </div>
        </div>
    );
};

export const AuditView: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState<AuditAction | 'ALL'>('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [showMetadata, setShowMetadata] = useState<Set<string>>(new Set());
    const [showComplianceInfo, setShowComplianceInfo] = useState(false);

    // Pagination state
    const ITEMS_PER_PAGE = 50;
    const [currentPage, setCurrentPage] = useState(1);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await getAuditLogs(500); // Fetch more for better history
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const toggleRow = (id: string) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedRows(newSet);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const workbook = await generateAuditWorkbook(filteredLogs);
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `auditoria_hospital_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setExporting(false);
        }
    };

    const [activeSection, setActiveSection] = useState<'ALL' | 'SESSIONS' | 'CENSUS' | 'CUDYR' | 'HANDOFF' | 'HANDOFF_NURSE' | 'HANDOFF_MEDICAL' | 'EXPORT_KEYS'>('ALL');

    const sections = {
        'ALL': { label: 'Todos', color: 'bg-slate-100 text-slate-600' },
        'SESSIONS': { label: 'Sesiones', color: 'bg-indigo-100 text-indigo-700', actions: ['USER_LOGIN', 'USER_LOGOUT'] },
        'CENSUS': { label: 'Censo Diario', color: 'bg-emerald-100 text-emerald-700', actions: ['PATIENT_ADMITTED', 'PATIENT_DISCHARGED', 'PATIENT_TRANSFERRED', 'PATIENT_MODIFIED', 'PATIENT_CLEARED', 'DAILY_RECORD_CREATED', 'DAILY_RECORD_DELETED'] },
        'CUDYR': { label: 'CUDYR', color: 'bg-amber-100 text-amber-700', actions: ['CUDYR_MODIFIED', 'VIEW_CUDYR'] },
        'HANDOFF_NURSE': { label: 'Entrega Enfermería', color: 'bg-purple-100 text-purple-700', actions: ['NURSE_HANDOFF_MODIFIED', 'VIEW_NURSING_HANDOFF', 'HANDOFF_NOVEDADES_MODIFIED'] },
        'HANDOFF_MEDICAL': { label: 'Entrega Médica', color: 'bg-sky-100 text-sky-700', actions: ['MEDICAL_HANDOFF_MODIFIED', 'VIEW_MEDICAL_HANDOFF', 'HANDOFF_NOVEDADES_MODIFIED'] },
        'EXPORT_KEYS': { label: 'Claves Excel', color: 'bg-rose-100 text-rose-700', actions: [] }
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const logDate = new Date(log.timestamp);
            const matchesSearch =
                (log.userId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (log.entityId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (log.patientIdentifier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                JSON.stringify(log.details || {}).toLowerCase().includes(searchTerm.toLowerCase());

            const matchesFilter = filterAction === 'ALL' || log.action === filterAction;

            // Section categorization
            const matchesSection = activeSection === 'ALL' ||
                (sections[activeSection] as any).actions?.includes(log.action);

            const matchesStartDate = !startDate || logDate >= new Date(startDate);
            const matchesEndDate = !endDate || logDate <= new Date(endDate + 'T23:59:59');

            return matchesSearch && matchesFilter && matchesSection && matchesStartDate && matchesEndDate;
        });
    }, [logs, searchTerm, filterAction, activeSection, startDate, endDate]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredLogs, currentPage, ITEMS_PER_PAGE]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterAction, activeSection, startDate, endDate]);

    return (
        <div className="space-y-6 animate-fade-in pb-24 font-sans max-w-[1400px] mx-auto">
            {/* Header: Glassmorphism */}
            <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <ClipboardList className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
                            Registro de Auditoría
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">Cumplimiento Ley 20.584 • Integridad Clínica</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowComplianceInfo(true)}
                        className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all border border-indigo-100"
                        title="Ver enfoque de auditoría MINSAL"
                    >
                        <Info size={20} />
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting || filteredLogs.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all font-bold text-sm border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        <Download size={18} className={exporting ? 'animate-bounce' : ''} />
                        {exporting ? 'Exportando...' : 'Exportar Excel'}
                    </button>
                    <button
                        onClick={fetchLogs}
                        className="p-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"
                        title="Actualizar datos"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Module Sections Navigation */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/50 rounded-2xl w-fit">
                {(Object.keys(sections) as Array<keyof typeof sections>).map((key) => (
                    <button
                        key={key}
                        onClick={() => setActiveSection(key)}
                        className={clsx(
                            "px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                            activeSection === key
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        )}
                    >
                        <div className={clsx("w-2 h-2 rounded-full", sections[key].color.split(' ')[0].replace('bg-', 'bg-'))} />
                        {sections[key].label}
                    </button>
                ))}
            </div>

            {/* Advanced Filters Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 items-end">
                {/* Search */}
                <div className="lg:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Búsqueda Inteligente</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Usuario, RUT, Cama o Diagnóstico..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>

                {/* Filter Action */}
                <div className="lg:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo de Acción</label>
                    <div className="relative">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value as AuditAction | 'ALL')}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
                        >
                            <option value="ALL">Todas las acciones</option>
                            {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Range Picker */}
                <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Export Keys Panel - Special Section */}
            {activeSection === 'EXPORT_KEYS' && (
                <ExportKeysPanel />
            )}

            {/* Logs Table: Modern Striped with Details */}
            {activeSection !== 'EXPORT_KEYS' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                                    <th className="px-6 py-4 text-left w-6"></th>
                                    <th className="px-4 py-4 text-left">Timestamp</th>
                                    <th className="px-4 py-4 text-left">Operador</th>
                                    <th className="px-4 py-4 text-left">Acción Realizada</th>
                                    <th className="px-4 py-4 text-left">Cama</th>
                                    <th className="px-4 py-4 text-left">Nombre Paciente</th>
                                    <th className="px-4 py-4 text-left">RUT</th>
                                    <th className="px-4 py-4 text-left">Vista rápida</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <RefreshCw size={40} className="animate-spin text-indigo-500 opacity-20" />
                                                <p className="text-slate-400 font-medium animate-pulse">Sincronizando registros clínicos...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-30">
                                                <Search size={48} className="text-slate-300" />
                                                <p className="text-slate-500 font-bold">No se encontraron rastros para los filtros aplicados</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedLogs.map((log) => {
                                        // Extract data from details for organized columns
                                        const bedId = (log.details?.bedId as string) || log.entityId;
                                        const patientName = (log.details?.patientName as string) || '';

                                        return (
                                            <React.Fragment key={log.id}>
                                                <tr
                                                    className={clsx(
                                                        "group hover:bg-slate-50/80 transition-all cursor-pointer",
                                                        expandedRows.has(log.id) ? "bg-indigo-50/20" : ""
                                                    )}
                                                    onClick={() => toggleRow(log.id)}
                                                >
                                                    <td className="px-6 py-4">
                                                        {expandedRows.has(log.id)
                                                            ? <ChevronDown size={18} className="text-indigo-500" />
                                                            : <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500" />
                                                        }
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-slate-900 font-bold">{formatTimestamp(log.timestamp).split(' ')[0]}</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">{formatTimestamp(log.timestamp).split(' ')[1]}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                                {(log.userId || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]" title={log.userId || 'Usuario desconocido'}>
                                                                    {(log.userId || 'anon@hhr.cl').split('@')[0]}
                                                                </span>
                                                                {log.authors && (
                                                                    <span className="text-[10px] text-slate-400 italic truncate max-w-[120px]" title={`Autores: ${log.authors}`}>
                                                                        {log.authors}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className={clsx(
                                                                "inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border shadow-sm",
                                                                actionColors[log.action]
                                                            )}>
                                                                {actionIcons[log.action]}
                                                                {AUDIT_ACTION_LABELS[log.action]}
                                                            </span>
                                                            {log.action === 'USER_LOGOUT' && log.details?.durationFormatted && (
                                                                <span className="text-[9px] text-slate-400 font-medium ml-1">
                                                                    Duración: {log.details.durationFormatted as string}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {log.entityType === 'user' ? (
                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Sistema</span>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                                                <MapPin size={12} className="text-slate-400" />
                                                                {bedId && (bedId as string).length < 15 ? bedId : '-'}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-xs font-medium text-slate-600 truncate max-w-[150px]">
                                                            {log.entityType === 'user' ? '-' : (patientName || '-')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {log.patientIdentifier ? (
                                                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md inline-block">
                                                                <CreditCard size={10} className="text-slate-400" />
                                                                <span className="text-[10px] font-mono text-slate-600">{log.patientIdentifier}</span>
                                                            </div>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-[10px] text-slate-400 italic truncate block max-w-[120px]">
                                                            {JSON.stringify(log.details || {}).slice(0, 40)}...
                                                        </span>
                                                    </td>
                                                </tr>
                                                {/* EXPANSIBLE DETAILS: HUMAN FRIENDLY */}
                                                {expandedRows.has(log.id) && (
                                                    <tr className="bg-slate-50/50">
                                                        <td colSpan={8} className="px-12 py-6 border-l-4 border-indigo-500/30">
                                                            <div className="space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                                        <FileText size={16} className="text-indigo-500" />
                                                                        <div className="flex flex-col">
                                                                            <span>{renderHumanDetails(log)}</span>
                                                                            {log.authors && (
                                                                                <span className="text-[10px] font-medium text-slate-400 italic">
                                                                                    Responsables: {log.authors}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </h4>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const newSet = new Set(showMetadata);
                                                                            if (newSet.has(log.id)) newSet.delete(log.id);
                                                                            else newSet.add(log.id);
                                                                            setShowMetadata(newSet);
                                                                        }}
                                                                        className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
                                                                    >
                                                                        <Activity size={12} />
                                                                        {showMetadata.has(log.id) ? 'Ocultar Metadata' : 'Ver Metadata Técnica'}
                                                                    </button>
                                                                </div>

                                                                {showMetadata.has(log.id) && (
                                                                    <div className="bg-slate-900 p-4 rounded-xl shadow-inner font-mono text-[10px] leading-relaxed overflow-x-auto text-sky-400">
                                                                        <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                                                                            <AlertCircle size={12} />
                                                                            <span className="uppercase tracking-widest font-bold">Detalles Técnicos / Sistema</span>
                                                                        </div>
                                                                        <pre className="opacity-90">
                                                                            {JSON.stringify(log.details || {}, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                )}

                                                                <div className="flex gap-6 pt-2">
                                                                    <div>
                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID Registro</p>
                                                                        <p className="text-[10px] text-slate-400 font-mono mt-1">{log.id}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


            {/* Pagination / Total info */}
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium px-2 py-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Mostrando {paginatedLogs.length} de {filteredLogs.length} filtrados ({logs.length} totales)
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold"
                        >
                            ← Anterior
                        </button>
                        <span className="text-slate-700 font-bold">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold"
                        >
                            Siguiente →
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-4 italic text-slate-400">
                    <AlertCircle size={14} />
                    Los registros de auditoría son de solo lectura y no pueden ser modificados.
                </div>
            </div>
            {/* Compliance Modal */}
            {showComplianceInfo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Info className="text-indigo-600" size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Enfoque de Auditoría y Cumplimiento MINSAL</h3>
                            </div>
                            <button
                                onClick={() => setShowComplianceInfo(false)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto text-sm text-slate-600 leading-relaxed font-sans">
                            <div className="space-y-6">
                                <section>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Marco Legal</h4>
                                    <p>El sistema se alinea con la <strong>Ley 20.584</strong> y la Norma Técnica de Ficha Clínica Electrónica, asegurando trazabilidad total e integridad de los datos.</p>
                                </section>

                                <section>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Trazabilidad de Visualización</h4>
                                    <p>Para cumplir con las exigencias de confianza clínica, el sistema registra obligatoriamente el acceso a:</p>
                                    <ul className="list-disc ml-5 mt-2 space-y-1 text-slate-500">
                                        <li>Entrega de Turno Médica (Evoluciones y Diagnósticos).</li>
                                        <li>Entrega de Turno Enfermería (Notas de Cuidados).</li>
                                        <li>Evaluación CUDYR (Categorización de riesgo).</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Protección de Datos</h4>
                                    <p>Cada registro captura el correo electrónico del usuario, marcas de tiempo inmutables y metadata de contexto técnico para asegurar la validez legal del rastro ante procesos médico-legales o acreditaciones.</p>
                                </section>

                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3 mt-4">
                                    <CheckCircle2 className="text-emerald-500 mt-0.5" size={16} />
                                    <div>
                                        <p className="text-xs font-bold text-emerald-800">Estado de los Registros</p>
                                        <p className="text-[11px] text-emerald-600 mt-1">Los datos aquí mostrados son de solo lectura y están protegidos contra cualquier intento de modificación o borrado accidental.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                            <button
                                onClick={() => setShowComplianceInfo(false)}
                                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

