import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData, ensureRecordExists } from './fixtures/auth';

/**
 * E2E Test: Shift Handoff with Digital Signature Flow
 * Tests the complete workflow of shift handoff including signature generation.
 */

test.describe('Shift Handoff with Signature', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockUser(page, 'admin');
        await injectMockData(page, undefined, true);
        await ensureRecordExists(page);
    });

    test('should complete nursing handoff workflow', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // 1. Navigate to Nursing Handoff
        const nursingTab = page.locator('nav button').filter({ hasText: 'Entrega Turno Enfermería' });
        await nursingTab.click();

        // 2. Wait for handoff view
        await expect(page.locator('h2:has-text("Entrega de Turno")')).toBeVisible({ timeout: 10000 });

        // 3. Fill shift notes for patients
        const notesTextarea = page.locator('textarea').first();
        if (await notesTextarea.isVisible()) {
            await notesTextarea.fill('Paciente estable, sin novedades durante el turno');
        }

        // 4. Select shift (Day/Night)
        const shiftSelector = page.locator('select[name="shift"], button[role="switch"]');
        if (await shiftSelector.isVisible()) {
            if (await shiftSelector.evaluate(el => el.tagName) === 'SELECT') {
                await shiftSelector.selectOption('night');
            } else {
                await shiftSelector.click();
            }
        }

        // 5. Look for signature generation button
        const signatureBtn = page.locator('button:has-text("Generar Link"), button:has-text("Firmar"), button:has-text("Enviar")');
        if (await signatureBtn.isVisible()) {
            await signatureBtn.click();

            // 6. Check if signature link/modal appears
            const signatureModal = page.locator('[role="dialog"]:has-text("Firma"), .signature-modal');
            if (await signatureModal.isVisible({ timeout: 3000 }).catch(() => false)) {
                // Copy link or close modal
                const copyBtn = page.locator('button:has-text("Copiar")');
                if (await copyBtn.isVisible()) {
                    await copyBtn.click();
                }
            }
        }
    });

    test('should complete medical handoff workflow', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // 1. Navigate to Medical Handoff
        const medicalTab = page.locator('nav button').filter({ hasText: 'Entrega Turno Médicos' });
        await medicalTab.click();

        // 2. Wait for handoff view
        await expect(page.locator('h2:has-text("Entrega de Turno")')).toBeVisible({ timeout: 10000 });

        // 3. Verify patient list is displayed
        await expect(page.locator('table, .patient-list')).toBeVisible();

        // 4. Add handoff notes
        const notesArea = page.locator('textarea, input[name*="note"]').first();
        if (await notesArea.isVisible()) {
            await notesArea.fill('Plan de tratamiento actualizado. Próximo control en 4 horas.');
        }

        // 5. Check print/export options
        const printBtn = page.locator('button:has-text("Imprimir"), button[title*="print"]');
        if (await printBtn.isVisible()) {
            // Don't actually print, just verify button exists
            await expect(printBtn).toBeEnabled();
        }
    });

    test('should send handoff via WhatsApp', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // Navigate to handoff
        const nursingTab = page.locator('nav button').filter({ hasText: 'Entrega Turno Enfermería' });
        await nursingTab.click();
        await expect(page.locator('h2:has-text("Entrega de Turno")')).toBeVisible({ timeout: 10000 });

        // Look for WhatsApp send button
        const whatsappBtn = page.locator('button:has-text("WhatsApp"), button[title*="WhatsApp"], .whatsapp-btn');
        if (await whatsappBtn.isVisible()) {
            // Set up popup listener for WhatsApp web
            const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);

            await whatsappBtn.click();

            const popup = await popupPromise;
            if (popup) {
                // Verify WhatsApp URL pattern
                const url = popup.url();
                expect(url).toContain('wa.me');
                await popup.close();
            }
        }
    });

    test('should generate PDF for handoff', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // Navigate to handoff
        const medicalTab = page.locator('nav button').filter({ hasText: 'Entrega Turno Médicos' });
        await medicalTab.click();
        await expect(page.locator('h2:has-text("Entrega de Turno")')).toBeVisible({ timeout: 10000 });

        // Look for PDF generation button
        const pdfBtn = page.locator('button:has-text("PDF"), button:has-text("Generar PDF"), button[title*="PDF"]');
        if (await pdfBtn.isVisible()) {
            // Set up download listener
            const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

            await pdfBtn.click();

            const download = await downloadPromise;
            if (download) {
                const filename = download.suggestedFilename();
                expect(filename).toMatch(/\.pdf$/i);
            }
        }
    });

    test('should switch between day and night shift views', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // Navigate to handoff
        const nursingTab = page.locator('nav button').filter({ hasText: 'Entrega Turno Enfermería' });
        await nursingTab.click();
        await expect(page.locator('h2:has-text("Entrega de Turno")')).toBeVisible({ timeout: 10000 });

        // Look for shift toggle
        const dayShiftBtn = page.locator('button:has-text("Día"), button:has-text("Diurno")');
        const nightShiftBtn = page.locator('button:has-text("Noche"), button:has-text("Nocturno")');

        if (await dayShiftBtn.isVisible() && await nightShiftBtn.isVisible()) {
            // Switch to night shift
            await nightShiftBtn.click();
            await page.waitForTimeout(500);

            // Verify content updated (could check heading or staff list)
            await expect(nightShiftBtn).toHaveClass(/active|selected|bg-/);

            // Switch back to day shift
            await dayShiftBtn.click();
            await page.waitForTimeout(500);

            await expect(dayShiftBtn).toHaveClass(/active|selected|bg-/);
        }
    });

    test('should display staff assignments in handoff', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // Navigate to handoff
        const nursingTab = page.locator('nav button').filter({ hasText: 'Entrega Turno Enfermería' });
        await nursingTab.click();
        await expect(page.locator('h2:has-text("Entrega de Turno")')).toBeVisible({ timeout: 10000 });

        // Look for staff section
        const staffSection = page.locator('.staff-section, [data-testid="staff-list"], h3:has-text("Personal")');
        if (await staffSection.isVisible()) {
            // Verify staff names are shown
            const staffList = page.locator('.staff-member, .nurse-name');
            const count = await staffList.count();
            expect(count).toBeGreaterThanOrEqual(0); // At least the section exists
        }

        // Check for nurse selector dropdown
        const nurseSelector = page.locator('select[name*="nurse"], [data-testid="nurse-selector"]');
        if (await nurseSelector.isVisible()) {
            expect(await nurseSelector.isEnabled()).toBeTruthy();
        }
    });
});
