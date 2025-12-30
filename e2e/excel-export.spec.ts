/**
 * E2E Tests: Excel Export Flow
 * Tests the Excel export functionality from the census view.
 */

import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData, ensureRecordExists } from './fixtures/auth';

test.describe('Excel Export Flow', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockUser(page, 'editor');
        await injectMockData(page);
        await ensureRecordExists(page);
    });

    test('should display export buttons', async ({ page }) => {
        const exportButton = page.locator('button:has-text("EXCEL")');
        await expect(exportButton).toBeVisible({ timeout: 10000 });
    });

    test('should trigger Excel download', async ({ page }) => {
        const exportButton = page.locator('button:has-text("EXCEL")').first();
        await expect(exportButton).toBeVisible({ timeout: 10000 });

        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
        await exportButton.click();

        const download = await downloadPromise;
        expect(download).not.toBeNull();

        const filename = download.suggestedFilename();
        expect(filename).toMatch(/\.(xlsx|xls)$/);
    });
});

test.describe('Export from Reports View', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockUser(page, 'editor');
        await injectMockData(page);
        await ensureRecordExists(page);
    });

    test('should navigate to Reports and display export options', async ({ page }) => {
        const reportsNav = page.locator('button:has-text("Reportes")').first();

        if (await reportsNav.isVisible({ timeout: 3000 }).catch(() => false)) {
            await reportsNav.click();
            await expect(page.locator('button:has-text("Censo Diario")').first()).toBeVisible();
            await expect(page.locator('button:has-text("CUDYR")').first()).toBeVisible();
        }
    });
});
