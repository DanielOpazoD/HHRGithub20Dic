import React from 'react';
import { MessageCircle } from 'lucide-react';
import { DebouncedTextarea } from '../../components/ui/DebouncedTextarea';

interface HandoffNovedadesProps {
    value: string;
    onChange: (val: string) => void;
}

export const HandoffNovedades: React.FC<HandoffNovedadesProps> = ({ value, onChange }) => {
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mt-4 print:border-none print:p-0 print:mt-2 print:bg-transparent">
            <h3 className="font-bold text-lg text-slate-700 mb-2 flex items-center gap-2 print:text-sm print:mb-1 print:text-black">
                <MessageCircle size={20} className="text-amber-500 print:w-4 print:h-4" />
                Novedades
            </h3>

            {/* Screen: Textarea */}
            <div className="print:hidden">
                <DebouncedTextarea
                    value={value || ''}
                    onChangeValue={onChange}
                    placeholder="Escriba las novedades del turno aquí..."
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-slate-700 min-h-[100px]"
                    debounceMs={1500}
                />
            </div>

            {/* Print: Full Content Div */}
            <div className="hidden print:block whitespace-pre-wrap break-words text-slate-800 text-sm print:text-[9px] print:leading-snug print:list-none">
                {value || <span className="italic text-slate-400">Sin novedades registradas.</span>}
            </div>
        </div>
    );
};
