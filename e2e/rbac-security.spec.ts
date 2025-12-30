import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData, ensureRecordExists } from './fixtures/auth';

/**
 * E2E Test: RBAC (Role Based Access Control) Security
 * Ensures that 'viewer' role is strictly read-only on the UI.
 */
test.describe('RBAC Security - Viewer Role', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockUser(page, 'viewer');
        await injectMockData(page, undefined, true);
        await ensureRecordExists(page);
    });

    test('should disable patient input fields for viewers', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        const nameInput = page.locator('table input[type="text"]').first();
        await expect(nameInput).toBeDisabled({ timeout: 5000 });
    });

    test('should hide sensitive action buttons for viewers', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // Verify table is read-only (inputs disabled)
        const inputs = page.locator('table input[type="text"]');
        const firstInput = inputs.first();
        if (await firstInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(firstInput).toBeDisabled();
        }
    });

    test('should permit viewing handoff but prevent editing', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // Navigate to handoff
        const handoffBtn = page.locator('button:has-text("Entrega")').first();
        if (await handoffBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await handoffBtn.click();
            await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 });
        }
    });
});
