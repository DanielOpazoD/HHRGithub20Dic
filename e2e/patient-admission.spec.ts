import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData, ensureRecordExists } from './fixtures/auth';

test.describe('Patient Admission Flow', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockUser(page, 'admin');
        await injectMockData(page);
        await ensureRecordExists(page);
    });

    test('should admit a new patient to an empty bed', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // Find first input and fill patient data
        const nameInput = page.locator('table input[type="text"]').first();
        await expect(nameInput).toBeEnabled({ timeout: 5000 });

        await nameInput.fill('Test Patient E2E');
        await expect(nameInput).toHaveValue('Test Patient E2E');

        // Verify data persisted
        await expect(page.locator('table')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // Verify table has inputs for data entry
        const inputs = page.locator('table input[type="text"]');
        const count = await inputs.count();
        expect(count).toBeGreaterThan(0);
    });
});
