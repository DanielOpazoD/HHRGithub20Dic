import { CENSUS_DEFAULT_RECIPIENTS } from '../../constants/email';
import { buildCensusMasterBuffer, getCensusMasterFilename } from '../../services/exporters/censusMasterWorkbook';
import { sendCensusEmail } from '../../services/email/gmailClient';
import type { DailyRecord } from '../../types';

const ALLOWED_ROLES = ['nurse_hospital', 'admin'];

export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Método no permitido'
        };
    }

    const requesterRole = (event.headers['x-user-role'] || event.headers['X-User-Role']) as string | undefined;
    const requesterEmail = (event.headers['x-user-email'] || event.headers['X-User-Email']) as string | undefined;
    if (!requesterRole || !ALLOWED_ROLES.includes(requesterRole)) {
        return {
            statusCode: 403,
            body: 'No autorizado para enviar correos de censo.'
        };
    }

    if (!event.body) {
        return {
            statusCode: 400,
            body: 'Solicitud inválida: falta el cuerpo.'
        };
    }

    try {
        const payload = JSON.parse(event.body);
        const { date, records, recipients, nursesSignature, body } = payload as {
            date: string;
            records: DailyRecord[];
            recipients?: string[];
            nursesSignature?: string;
            body?: string;
        };

        if (!date || !Array.isArray(records) || records.length === 0) {
            return {
                statusCode: 400,
                body: 'Solicitud inválida: falta la fecha o los datos del censo.'
            };
        }

        const monthRecords = records
            .filter((r): r is DailyRecord => Boolean(r?.date))
            .sort((a, b) => a.date.localeCompare(b.date));

        if (monthRecords.length === 0) {
            return {
                statusCode: 400,
                body: 'No hay registros disponibles para generar el Excel maestro.'
            };
        }

        const attachmentBufferRaw = await buildCensusMasterBuffer(monthRecords);
        const attachmentName = getCensusMasterFilename(date);

        // Generate dynamic 6-digit PIN and encrypt workbook
        const pin = Math.floor(100000 + Math.random() * 900000).toString();

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const XlsxPopulate = require('xlsx-populate');
        const attachmentBuffer = await XlsxPopulate.fromDataAsync(attachmentBufferRaw)
            .then((workbook: any) => workbook.outputAsync({ password: pin }));

        const resolvedRecipients: string[] = Array.isArray(recipients) && recipients.length > 0
            ? recipients
            : CENSUS_DEFAULT_RECIPIENTS;

        const gmailResponse = await sendCensusEmail({
            date,
            recipients: resolvedRecipients,
            attachmentBuffer,
            attachmentName,
            nursesSignature,
            body,
            requestedBy: requesterEmail,
            encryptionPin: pin // Pass the PIN so it can be included in the email body
        });

        console.log('Gmail send response', gmailResponse);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Correo enviado', gmailId: gmailResponse.id })
        };
    } catch (error: any) {
        console.error('Error enviando correo de censo', error);
        const message = error?.message || 'Error desconocido enviando el correo.';
        return {
            statusCode: 500,
            body: message
        };
    }
};
