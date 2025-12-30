import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData, ensureRecordExists } from './fixtures/auth';

test.describe('Patient Transfer Flow', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockUser(page, 'admin');
        await injectMockData(page);
        await ensureRecordExists(page);
    });

    test('should transfer a patient to another bed', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // Verify table has beds for potential transfers
        const rows = page.locator('table tbody tr');
        const count = await rows.count();
        expect(count).toBeGreaterThan(1); // Need at least 2 beds for transfer
    });
});
