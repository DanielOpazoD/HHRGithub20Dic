import React from 'react';

interface HandoffPrintHeaderProps {
    title: string;
    dateString: string;
    schedule?: {
        dayStart: string;
        dayEnd: string;
        nightStart: string;
        nightEnd: string;
    };
    selectedShift?: 'day' | 'night';
    isMedical: boolean;
    deliversList?: string[];
    receivesList?: string[];
    tensList?: string[];
}

export const HandoffPrintHeader: React.FC<HandoffPrintHeaderProps> = ({
    title,
    dateString,
    schedule,
    selectedShift,
    isMedical,
    deliversList = [],
    receivesList = [],
    tensList = []
}) => {
    return (
        <div className="hidden print:block mb-2 pb-2 border-b border-slate-400">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-start gap-3">
                    <img
                        src="/images/logos/logo_HHR.png"
                        alt="Hospital Hanga Roa"
                        className="h-12 w-auto print:h-10"
                    />
                    <div>
                        <h1 className="text-2xl print:text-lg font-bold text-slate-900 uppercase tracking-tight">
                            {title}
                        </h1>
                        <p className="text-sm text-slate-600 font-medium mt-1 uppercase tracking-wide print:text-xs">
                            Servicio Hospitalizados Hanga Roa
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xl print:text-base font-bold text-slate-900">{dateString}</div>
                    {!isMedical && schedule && (
                        <div className="text-sm text-slate-600 uppercase print:text-xs">
                            {selectedShift === 'day'
                                ? `Turno Largo (${schedule.dayStart} - ${schedule.dayEnd})`
                                : `Turno Noche (${schedule.nightStart} - ${schedule.nightEnd})`
                            }
                        </div>
                    )}
                </div>
            </div>

            {/* Print: Show Responsible Nurses & TENS - Compact inline layout */}
            {!isMedical && (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[10px] border-t border-slate-300 pt-2">
                    <div className="flex items-baseline gap-1">
                        <span className="font-bold text-slate-900 uppercase whitespace-nowrap">Entrega:</span>
                        <span className="text-slate-800">
                            {deliversList.length > 0 ? deliversList.filter(Boolean).join(', ') : <span className="italic text-slate-400">Sin especificar</span>}
                        </span>
                    </div>
                    <span className="text-slate-400">|</span>
                    <div className="flex items-baseline gap-1">
                        <span className="font-bold text-slate-900 uppercase whitespace-nowrap">Recibe:</span>
                        <span className="text-slate-800">
                            {receivesList.length > 0 ? receivesList.filter(Boolean).join(', ') : <span className="italic text-slate-400">Sin especificar</span>}
                        </span>
                    </div>
                    <span className="text-slate-400">|</span>
                    <div className="flex items-baseline gap-1">
                        <span className="font-bold text-slate-900 uppercase whitespace-nowrap">TENS:</span>
                        <span className="text-slate-800">
                            {tensList.length > 0 ? tensList.filter(Boolean).join(', ') : <span className="italic text-slate-400">Sin registro</span>}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
