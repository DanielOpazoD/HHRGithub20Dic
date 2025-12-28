/**
 * E2E Tests: Patient Operations
 * Tests discharge and transfer patient flows with mocked authentication.
 */

import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData } from './fixtures/auth';

test.describe('Patient Operations Flow', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockUser(page, 'editor');
        await injectMockData(page, undefined, true); // Inject with some patients already there
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
    });

    test('should show discharge modal and perform discharge', async ({ page }) => {
        // Find a bed with a patient (MOCK_PATIENT from auth.ts is in R1)
        const row = page.locator('tr:has-text("R1")').first();

        // Open action menu (the one with MoreHorizontal icon)
        await row.locator('button[title="Acciones"]').click();

        // Click "Dar de Alta" in the menu
        await page.locator('button:has-text("Dar de Alta")').click();

        // Modal "Confirmar Alta Médica" should appear
        await expect(page.locator('h3:has-text("Confirmar Alta Médica")')).toBeVisible();

        // Click "Confirmar Alta" button in modal
        await page.locator('button:has-text("Confirmar Alta")').click();

        // Bed should be empty now
        const nameInput = row.locator('input[type="text"]').first();
        await expect(nameInput).toHaveValue('');

        // Should appear in discharge section below
        await expect(page.locator('text=Pacientes dados de Alta')).toBeVisible();
        await expect(page.locator('tr:has-text("MOCK PATIENT")')).toBeVisible();
    });

    test('should switch to Medical Handoff view', async ({ page }) => {
        // Navigation buttons are in the header/nav
        const medicalHandoffBtn = page.locator('button:has-text("Entrega Turno Médicos")').first();
        await medicalHandoffBtn.click();

        // Should see the view title
        await expect(page.locator('h2:has-text("Entrega de Turno")').first()).toBeVisible();
    });

    test('should switch to Nursing Handoff view', async ({ page }) => {
        const nursingHandoffBtn = page.locator('button:has-text("Entrega Turno Enfermería")').first();
        await nursingHandoffBtn.click();

        // Should see nursing specific content
        await expect(page.locator('h2:has-text("Entrega de Turno Enfermería")').first()).toBeVisible();
    });
});
