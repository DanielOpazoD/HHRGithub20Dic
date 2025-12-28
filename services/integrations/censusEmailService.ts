import { DailyRecord } from '../../types';
import { CENSUS_DEFAULT_RECIPIENTS } from '../../constants/email';

interface TriggerEmailParams {
    date: string;
    records: DailyRecord[];
    recipients?: string[];
    nursesSignature?: string;
    body?: string;
    userEmail?: string | null;
    userRole?: string | null;
}

const ENDPOINT = '/.netlify/functions/send-census-email';

// Check if we're in development mode (Vite dev server)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isDevelopment = (import.meta as any).env?.DEV ?? false;

export const triggerCensusEmail = async (params: TriggerEmailParams) => {
    const { date, records, recipients, nursesSignature, body, userEmail, userRole } = params;

    // In development, Netlify functions are not available
    if (isDevelopment) {
        console.log('[CensusEmail] Modo desarrollo - el envío de correo solo funciona en Netlify.');
        console.log('[CensusEmail] Datos que se enviarían:', {
            date,
            recipientCount: recipients?.length || CENSUS_DEFAULT_RECIPIENTS.length,
            recordCount: records.length,
        });

        // Show a user-friendly message instead of crashing
        throw new Error('El envío de correo automático solo está disponible cuando la aplicación está desplegada en Netlify. En desarrollo local, puedes verificar los datos en la consola.');
    }

    const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-email': userEmail || '',
            'x-user-role': userRole || ''
        },
        body: JSON.stringify({
            date,
            records,
            recipients: recipients && recipients.length > 0 ? recipients : CENSUS_DEFAULT_RECIPIENTS,
            nursesSignature,
            body
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'No se pudo enviar el correo.');
    }

    return response.json();
};
