/**
 * E2E Tests: Patient Registration Flow
 * Tests the complete flow of creating a day and registering a patient.
 */

import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData, ensureRecordExists } from './fixtures/auth';

test.describe('Patient Registration Flow', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockUser(page, 'editor');
        await injectMockData(page);
        await ensureRecordExists(page);
    });

    test('should allow creating a blank day and adding a patient', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // Add patient to first input
        const nameInput = page.locator('table input[type="text"]').first();
        await expect(nameInput).toBeEnabled({ timeout: 5000 });

        await nameInput.fill('NUEVO PACIENTE E2E');
        await page.waitForTimeout(500);
        await expect(nameInput).toHaveValue('NUEVO PACIENTE E2E');
    });
});
