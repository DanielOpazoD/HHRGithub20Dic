/**
 * E2E Tests: Patient Registration Flow
 * Tests the complete flow of creating a day and registering a patient.
 */

import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData } from './fixtures/auth';

test.describe('Patient Registration Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await injectMockUser(page, 'editor');
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
    });

    test('should allow creating a blank day and adding a patient', async ({ page }) => {
        // If the day is empty, we should see the EmptyDayPrompt
        const registroEnBlancoBtn = page.locator('button:has-text("Registro en Blanco")');

        // Wait for button to be visible and click it
        await expect(registroEnBlancoBtn).toBeVisible({ timeout: 10000 });
        await registroEnBlancoBtn.click();

        // Wait for census table
        await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

        // Add patient to R1
        const row = page.locator('tr:has-text("R1")');
        const nameInput = row.locator('input[type="text"]').first();

        await nameInput.fill('NUEVO PACIENTE E2E');
        // Wait for state updates
        await page.waitForTimeout(1000);
        await expect(nameInput).toHaveValue('NUEVO PACIENTE E2E');

        // Check if stats updated (should show 1 patient)
        // Ocupadas is in a span next to the label
        const occupiedCount = page.locator('span:has-text("Ocupadas:") + span').first();
        await expect(occupiedCount).toHaveText('1', { timeout: 10000 });
    });
});
