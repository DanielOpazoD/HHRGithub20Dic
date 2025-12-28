import { formatDateDDMMYYYY } from '../services/utils/dateFormatter';

export const CENSUS_DEFAULT_RECIPIENTS = [
    'arenka.palma@hospitalhangaroa.cl',
    'natalia.arzola@hospitalhangaroa.cl',
    'vaitiare.hereveri@hospitalhangaroa.cl',
    'kaany.pakomio@hospitalhangaroa.cl',
    'claudia.salgado@hospitalhangaroa.cl',
    'andrea.saldana@saludoriente.cl',
    'bianca.atam@hospitalhangaroa.cl',
    'ana.pont@hospitalhangaroa.cl',
    'katherin.pont@hospitalhangaroa.cl',
    'eyleen.cisternas@hospitalhangaroa.cl',
    'marco.ramirez@hospitalhangaroa.cl',
    'josemiguel.villavicencio@hospitalhangaroa.cl',
    'patricio.medina@saludoriente.cl',
    'carla.curinao@hospitalhangaroa.cl',
    'epidemiologia@hospitalhangaroa.cl',
    'archivosome@hospitalhangaroa.cl',
    'antonio.espinoza@hospitalhangaroa.cl',
    'juan.pakomio@hospitalhangaroa.cl',
    'gestion.camas@saludoriente.cl',
    'ivan.pulgar@hospitalhangaroa.cl',
    'daniel.opazo@hospitalhangaroa.cl'
];

// Use simple hyphen to avoid encoding issues
export const buildCensusEmailSubject = (date: string) => `Censo diario pacientes hospitalizados - ${formatDateDDMMYYYY(date)}`;

/**
 * Builds the census email body in HTML format.
 * Includes a blue-red separator line before the nurse signature.
 */
export const buildCensusEmailBody = (date: string, nursesSignature?: string, encryptionPin?: string): string => {
    // Parse date to get day, month name, year
    const [year, month, day] = date.split('-');
    const monthNames = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const monthName = monthNames[parseInt(month, 10) - 1] || month;
    const dayNum = parseInt(day, 10);

    // Security note
    const securityNote = encryptionPin
        ? `<p><strong>Clave Excel:</strong> ${encryptionPin}</p>`
        : '';

    // Visual separator: blue and red horizontal lines
    const separator = `
        <div style="margin: 20px 0 10px 0;">
            <div style="height: 3px; background-color: #1a237e; width: 200px;"></div>
            <div style="height: 3px; background-color: #c62828; width: 200px; margin-top: 2px;"></div>
        </div>
    `;

    // Nurse signature block
    const signatureBlock = nursesSignature
        ? `${separator}
           <p style="margin: 0;"><strong>${nursesSignature}</strong></p>
           <p style="margin: 0; color: #555;">Enfermería - Servicio Hospitalizados</p>
           <p style="margin: 0; color: #555;">Hospital Hanga Roa</p>
           <p style="margin: 0; color: #555;">Anexo MINSAL 328388</p>`
        : `${separator}
           <p style="margin: 0; color: #555;">Enfermería - Servicio Hospitalizados</p>
           <p style="margin: 0; color: #555;">Hospital Hanga Roa</p>
           <p style="margin: 0; color: #555;">Anexo MINSAL 328388</p>`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.5;">
    <p>Estimados.</p>
    <p>Junto con saludar, envío adjunto planilla estadística de pacientes hospitalizados correspondiente al día ${dayNum} de ${monthName} de ${year}.</p>
    ${securityNote}
    <p>Saludos cordiales</p>
    ${signatureBlock}
</body>
</html>
    `.trim();
};

