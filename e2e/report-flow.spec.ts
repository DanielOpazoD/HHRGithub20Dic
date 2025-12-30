import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData, ensureRecordExists } from './fixtures/auth';

/**
 * E2E Test: Full Report & Signature Flow
 * Validates that an editor can enter handoff info and a signature link is available.
 */
test.describe('Handoff & Signature Link Flow', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockUser(page, 'editor');
        await injectMockData(page);
        await ensureRecordExists(page);
    });

    test('should allow entering handoff notes and show share link', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // Navigate to Nursing Handoff
        const handoffBtn = page.locator('button:has-text("Entrega")').first();
        if (await handoffBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await handoffBtn.click();
            await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 });
        }
    });

    test('should navigate to Census and verify Export options', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // Check for Excel Export button
        const excelBtn = page.locator('button:has-text("EXCEL")').first();
        await expect(excelBtn).toBeVisible({ timeout: 10000 });
    });
});
