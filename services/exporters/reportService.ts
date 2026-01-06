
import type { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { DailyRecord } from '../../types';
import { getStoredRecords, getRecordForDate } from '../dataService';
import { buildCensusDailyRawWorkbook, extractRowsFromRecord, getCensusRawHeader } from './censusRawWorkbook';
import { BEDS } from '../../constants';
import { createWorkbook } from './excelUtils';
import {
    buildDailyCudyrSummary,
    collectDailyCudyrPatients,
    getCudyrMonthlyTotals,
    CATEGORY_CODES
} from '../cudyr/cudyrReportService';


// --- UTILS ---

const saveWorkbook = async (workbook: Workbook, filename: string) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename + '.xlsx');
};

// --- EXPORT FUNCTIONS ---

export const generateCensusDailyRaw = async (date: string) => {
    const record = await getRecordForDate(date);
    if (!record) {
        alert("No hay datos para la fecha seleccionada.");
        return;
    }

    const workbook = buildCensusDailyRawWorkbook(record);

    await saveWorkbook(workbook, `Censo_HangaRoa_Bruto_${date}`);
};

export const generateCensusRangeRaw = async (startDate: string, endDate: string) => {
    const allRecords = getStoredRecords();
    // Filter dates within range (inclusive)
    const dates = Object.keys(allRecords).filter(d => d >= startDate && d <= endDate).sort();

    if (dates.length === 0) {
        alert("No hay registros en el rango de fechas seleccionado.");
        return;
    }

    const workbook = createWorkbook();
    const sheet = workbook.addWorksheet('Datos Brutos');

    sheet.addRow(getCensusRawHeader());

    dates.forEach(date => {
        const record = allRecords[date];
        const rows = extractRowsFromRecord(record);
        rows.forEach(r => sheet.addRow(r));
    });

    await saveWorkbook(workbook, `Censo_HangaRoa_Rango_${startDate}_${endDate}`);
};

export const generateCensusMonthRaw = async (year: number, month: number) => {
    // Construct range YYYY-MM-01 to YYYY-MM-31
    const mStr = String(month + 1).padStart(2, '0');
    const startDate = `${year}-${mStr}-01`;
    const endDate = `${year}-${mStr}-31`; // Loose end date covers full month

    await generateCensusRangeRaw(startDate, endDate);
};


// --- PLACEHOLDERS FOR FORMATTED REPORTS ---

export const generateCensusDailyFormatted = async (date: string) => {
    alert("Funcionalidad 'Formato Especial' en desarrollo.");
    // TODO: Implement complex styling here reflecting the visual request
};

export const generateCensusRangeFormatted = async (startDate: string, endDate: string) => {
    alert("Funcionalidad 'Formato Especial' en desarrollo.");
};

// --- CUDYR EXPORTS ---

export const generateCudyrDailyRaw = async (date: string) => {
    const record = await getRecordForDate(date);
    if (!record) { alert("Sin datos"); return; }

    const workbook = createWorkbook();
    const detailSheet = workbook.addWorksheet('CUDYR Diario');
    detailSheet.addRow(['FECHA', 'CAMA', 'PACIENTE', 'RUT', 'DEPENDENCIA', 'RIESGO', 'CATEGORIA', 'TIPO CAMA']);

    const patients = collectDailyCudyrPatients(record);
    patients.forEach(p => {
        detailSheet.addRow([
            date,
            p.bedName,
            p.patientName,
            p.rut,
            p.depScore,
            p.riskScore,
            p.category,
            p.bedType
        ]);
    });

    const summary = buildDailyCudyrSummary(record);
    const summarySheet = workbook.addWorksheet('Resumen Diario');
    summarySheet.addRow(['TIPO CAMA', ...CATEGORY_CODES, 'TOTAL']);
    (['UTI', 'MEDIA'] as const).forEach(type => {
        summarySheet.addRow([
            type,
            ...CATEGORY_CODES.map(code => summary.countsByType[type][code]),
            summary.totalsByType[type]
        ]);
    });

    await saveWorkbook(workbook, `CUDYR_${date}`);
};

export const generateCudyrMonthlyExcel = async (year: number, month: number) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayIso = today.toISOString().split('T')[0];

    const endDate = year === currentYear && month === currentMonth ? todayIso : undefined;
    const totals = await getCudyrMonthlyTotals(year, month, endDate);
    const workbook = createWorkbook();

    // Sheet 1: resumen maestro (mes a la fecha)
    const summarySheet = workbook.addWorksheet('Resumen Mensual');
    summarySheet.addRow(['AÑO', 'MES', totals.year, month + 1]);
    summarySheet.addRow(['HASTA', endDate ?? 'Mes completo']);
    summarySheet.addRow([]);
    summarySheet.addRow(['TIPO CAMA', ...CATEGORY_CODES, 'TOTAL']);
    (['UTI', 'MEDIA'] as const).forEach(type => {
        summarySheet.addRow([
            type,
            ...CATEGORY_CODES.map(code => totals.countsByType[type][code]),
            totals.totalsByType[type]
        ]);
    });
    summarySheet.addRow([]);
    summarySheet.addRow(['TOTAL CATEGORIZADOS', totals.categorizedPatients]);
    summarySheet.addRow(['TOTAL OCUPADOS', totals.occupiedPatients]);

    // Sheets por día con resumen compacto
    totals.summaries.forEach(summary => {
        const [y, m, d] = summary.date.split('-');
        const sheetName = `${d}-${m}-${y}`;
        const sheet = workbook.addWorksheet(sheetName);
        sheet.addRow(['Fecha', summary.date]);
        sheet.addRow([]);
        sheet.addRow(['TIPO CAMA', ...CATEGORY_CODES, 'TOTAL']);
        (['UTI', 'MEDIA'] as const).forEach(type => {
            sheet.addRow([
                type,
                ...CATEGORY_CODES.map(code => summary.countsByType[type][code]),
                summary.totalsByType[type]
            ]);
        });
        sheet.addRow([]);
        sheet.addRow(['Categorizados', summary.categorizedPatients]);
        sheet.addRow(['Ocupados', summary.occupiedPatients]);
    });

    await saveWorkbook(workbook, `CUDYR_Mensual_${totals.year}-${String(month + 1).padStart(2, '0')}`);
};
