import { createWorkbook, BORDER_THIN, HEADER_FILL } from './excelUtils';
import { getCudyrMonthlyTotals, CATEGORIES, CudyrSummary } from '../calculations/cudyrSummary';
import { saveAs } from 'file-saver';
import { Workbook, Worksheet } from 'exceljs';

/**
 * Saves a workbook to the client
 */
const saveWorkbook = async (workbook: Workbook, filename: string) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename + '.xlsx');
};

/**
 * Applies standard styles to a CUDYR count grid
 */
const applyGridStyles = (sheet: Worksheet, startRow: number, startCol: number, rowsCount: number, colsCount: number) => {
    for (let r = 0; r <= rowsCount; r++) {
        for (let c = 0; c <= colsCount; c++) {
            const cell = sheet.getCell(startRow + r, startCol + c);
            cell.border = BORDER_THIN;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (r === 0 || c === 0) {
                cell.font = { bold: true };
                cell.fill = HEADER_FILL;
            }
        }
    }
};

/**
 * Writes a 4x3 CUDYR grid (UTI vs Media) for a day with totals and occupancy stats
 */
const writeDailyGrid = (
    sheet: Worksheet,
    summary: CudyrSummary,
    title: string,
    startRow: number,
    occupiedCount?: number,
    categorizedCount?: number
) => {
    sheet.mergeCells(startRow, 1, startRow, 7);
    const titleCell = sheet.getCell(startRow, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'left' };

    const headerRow = startRow + 2;
    sheet.getRow(headerRow).values = ['CAT', 'UTI', 'MEDIA', 'TOTAL'];

    CATEGORIES.forEach((cat, index) => {
        const row = headerRow + 1 + index;
        const uti = summary.uti[cat] || 0;
        const media = summary.media[cat] || 0;
        sheet.getRow(row).values = [cat, uti, media, uti + media];
    });

    // Calculate totals
    const utiTotal = Object.values(summary.uti).reduce((a, b) => a + b, 0);
    const mediaTotal = Object.values(summary.media).reduce((a, b) => a + b, 0);
    const grandTotal = utiTotal + mediaTotal;

    // Add totals row
    const totalsRow = headerRow + 1 + CATEGORIES.length;
    sheet.getRow(totalsRow).values = ['TOTAL', utiTotal, mediaTotal, grandTotal];
    sheet.getRow(totalsRow).font = { bold: true };

    applyGridStyles(sheet, headerRow, 1, CATEGORIES.length + 1, 3);

    // Add occupancy statistics if provided
    let nextRow = totalsRow + 2;
    if (occupiedCount !== undefined && categorizedCount !== undefined) {
        const index = occupiedCount > 0 ? Math.round((categorizedCount / occupiedCount) * 100) : 0;

        sheet.getRow(nextRow).values = ['Estadísticas de Ocupación'];
        sheet.getCell(nextRow, 1).font = { bold: true };
        sheet.mergeCells(nextRow, 1, nextRow, 4);
        nextRow++;

        sheet.getRow(nextRow).values = ['Camas Ocupadas:', occupiedCount];
        nextRow++;
        sheet.getRow(nextRow).values = ['Categorizados:', categorizedCount];
        nextRow++;
        sheet.getRow(nextRow).values = ['Índice (%):', `${index}%`];
        sheet.getCell(nextRow, 2).font = { bold: true, color: { argb: index === 100 ? 'FF008000' : 'FF0000FF' } };
        nextRow++;
    }

    return nextRow + 1;
};

/**
 * Generates the Monthly CUDYR Excel report
 */
export const generateCudyrMonthlyExcel = async (year: number, month: number, endDate?: string) => {
    const { dailySummaries, monthlyTotal, dates, totalOccupied, totalCategorized } = await getCudyrMonthlyTotals(year, month, endDate);

    const workbook = createWorkbook();
    workbook.creator = 'Hospital Hanga Roa - Tracker';

    // 1. MASTER SUMMARY SHEET
    const masterSheet = workbook.addWorksheet('Resumen Mensual');
    masterSheet.getColumn(1).width = 20;
    masterSheet.getColumn(2).width = 12;
    masterSheet.getColumn(3).width = 12;
    masterSheet.getColumn(4).width = 12;

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // Format endDate from yyyy-mm-dd to dd-mm-yyyy
    const formattedEndDate = endDate ? endDate.split('-').reverse().join('-') : null;
    const title = `Resumen CUDYR - ${monthNames[month]} ${year}${formattedEndDate ? ` (hasta ${formattedEndDate})` : ''}`;


    writeDailyGrid(masterSheet, monthlyTotal, title, 1, totalOccupied, totalCategorized);

    // 2. DAILY SHEETS
    dates.forEach(date => {
        const summary = dailySummaries[date];
        // Sheet name format: dd-mm-yyyy
        const [y, m, d] = date.split('-');
        const sheetName = `${d}-${m}-${y}`;
        const daySheet = workbook.addWorksheet(sheetName);

        daySheet.getColumn(1).width = 20;
        daySheet.getColumn(2).width = 12;
        daySheet.getColumn(3).width = 12;
        daySheet.getColumn(4).width = 12;

        writeDailyGrid(daySheet, summary, `Estadísticas CUDYR - ${sheetName}`, 1, summary.occupiedCount, summary.categorizedCount);
    });

    const filename = `CUDYR_Mensual_${year}_${month + 1}_${endDate || 'completo'}`;
    await saveWorkbook(workbook, filename);
};
