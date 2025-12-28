import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData } from './fixtures/auth';

/**
 * E2E Test: Complete Day Workflow
 * Simulates a full hospital day: Login -> Load data -> Shift change -> Logout
 */

test.describe('Complete Hospital Day E2E', () => {
    test('should complete a full hospital day workflow', async ({ page }) => {
        // 1. LOGIN (via mock) and clear storage
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await injectMockUser(page, 'admin');
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // 2. CREATE DAY
        const registroEnBlancoBtn = page.locator('button:has-text("Registro en Blanco")');
        await expect(registroEnBlancoBtn).toBeVisible({ timeout: 15000 });
        await registroEnBlancoBtn.click();
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // 3. ADD PATIENT
        const rowR1 = page.locator('tr:has-text("R1")');
        const nameInput = rowR1.locator('input[type="text"]').first();
        await nameInput.fill('PACIENTE WORKFLOW');
        await rowR1.locator('input[type="text"]').nth(1).fill('12345678');
        await rowR1.locator('input[type="text"]').nth(3).fill('DIAGNOSTICO TEST');

        // Wait for state updates
        await page.waitForTimeout(1000);

        // 4. NAVIGATE TO NURSING HANDOFF
        // Use the nav tab specifically
        const nursingTab = page.locator('nav button').filter({ hasText: 'Entrega Turno Enfermería' });
        await nursingTab.click();

        // Wait for the specific heading in HandoffView
        const handoffHeading = page.locator('h2:has-text("Entrega de Turno Enfermería")');
        await expect(handoffHeading).toBeVisible({ timeout: 20000 });

        // 5. FILL HANDOFF
        const novedadesTextarea = page.locator('textarea').first();
        if (await novedadesTextarea.isVisible()) {
            await novedadesTextarea.fill('TODO BIEN EN EL TURNO');
            await page.waitForTimeout(500);
        }

        // 6. NAVIGATE TO MEDICAL HANDOFF
        const medicalTab = page.locator('nav button').filter({ hasText: 'Entrega Turno Médicos' });
        await medicalTab.click();
        await expect(page.locator('h2:has-text("Entrega de Turno")').first()).toBeVisible({ timeout: 20000 });

        // 7. NAVIGATE BACK TO CENSUS
        const censusTab = page.locator('nav button').filter({ hasText: 'Censo Diario' });
        await censusTab.click();
        await expect(page.locator('table')).toBeVisible({ timeout: 20000 });

        // 8. LOGOUT
        const userMenuButton = page.locator('button:has-text("D")').first();
        await userMenuButton.click();

        const logoutButton = page.locator('button:has-text("Cerrar sesión")').first();
        await logoutButton.click();

        await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
    });

    test('should prevent unauthorized access (viewer role)', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await injectMockUser(page, 'viewer');
        await injectMockData(page, undefined, true); // Populate with patient
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Inputs should be disabled
        const rowR1 = page.locator('tr:has-text("R1")');
        const patientInput = rowR1.locator('input[type="text"]').first();
        await expect(patientInput).toBeDisabled({ timeout: 15000 });
    });
});
