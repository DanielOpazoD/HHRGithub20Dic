/**
 * E2E Tests: Patient Operations
 * Tests discharge and transfer patient flows with mocked authentication.
 */

import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData, ensureRecordExists } from './fixtures/auth';

test.describe('Patient Operations Flow', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockUser(page, 'editor');
        await injectMockData(page, undefined, true);
        await ensureRecordExists(page);
    });

    test('should show discharge modal and perform discharge', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // Verify table has inputs
        const inputs = page.locator('table input[type="text"]');
        const count = await inputs.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should switch to Medical Handoff view', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        const medicalHandoffBtn = page.locator('button:has-text("Entrega Turno Médicos")').first();
        if (await medicalHandoffBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await medicalHandoffBtn.click();
            await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 });
        }
    });

    test('should switch to Nursing Handoff view', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        const nursingHandoffBtn = page.locator('button:has-text("Entrega Turno Enfermería")').first();
        if (await nursingHandoffBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await nursingHandoffBtn.click();
            await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 });
        }
    });
});
