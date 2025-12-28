import React from 'react';
import { DailyRecord } from '../../types';
import { MONTH_NAMES } from '../../constants';
import { Calendar, Plus, Copy } from 'lucide-react';

interface EmptyDayPromptProps {
    selectedDay: number;
    selectedMonth: number;
    previousRecordAvailable: DailyRecord | null;
    onCreateDay: (copyFromPrevious: boolean) => void;
}

export const EmptyDayPrompt: React.FC<EmptyDayPromptProps> = ({
    selectedDay,
    selectedMonth,
    previousRecordAvailable,
    onCreateDay
}) => {
    return (
        <div className="card flex flex-col items-center justify-center py-16 mt-8 print:hidden animate-fade-in">
            <div className="bg-slate-50 p-6 rounded-full mb-6">
                <Calendar size={64} className="text-medical-200" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
                {selectedDay} de {MONTH_NAMES[selectedMonth]}
            </h2>
            <p className="text-slate-500 mb-8 text-center max-w-md">
                No existe registro para esta fecha.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                {previousRecordAvailable && (
                    <button
                        onClick={() => onCreateDay(true)}
                        className="btn group !p-6 !h-auto border-2 border-medical-600 text-medical-700 hover:bg-medical-50 bg-white shadow-sm flex-col w-64"
                    >
                        <div className="flex items-center gap-2 text-lg font-bold">
                            <Copy size={20} />
                            <span>Copiar del Anterior</span>
                        </div>
                        <span className="text-xs font-normal text-medical-600/80">
                            Copia pacientes y camas del {previousRecordAvailable.date}
                        </span>
                    </button>
                )}

                <button
                    onClick={() => onCreateDay(false)}
                    className="btn btn-primary group !p-6 !h-auto shadow-lg shadow-medical-500/30 flex-col w-64"
                >
                    <div className="flex items-center gap-2 text-lg font-bold">
                        <Plus size={20} />
                        <span>Registro en Blanco</span>
                    </div>
                    <span className="text-xs font-normal text-medical-100">
                        Iniciar turno desde cero
                    </span>
                </button>
            </div>
        </div>
    );
};
