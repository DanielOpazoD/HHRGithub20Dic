/**
 * E2E Tests: Passport Authentication Flow
 * Tests login with .hhr passport file (offline authentication).
 */

import { test, expect } from '@playwright/test';

test.describe('Passport File Authentication UI', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
    });

    test('should display passport upload option on login page', async ({ page }) => {
        // Find the "Acceso Offline con Pasaporte" area
        const passportToggle = page.locator('text=Acceso Offline con Pasaporte').first();
        await expect(passportToggle).toBeVisible();

        await passportToggle.click();

        // Should show the file input (it's hidden but attached)
        await expect(page.locator('input[type="file"]')).toBeAttached();
    });

    test('should show error for invalid passport file', async ({ page }) => {
        const passportToggle = page.locator('text=Acceso Offline con Pasaporte').first();
        await passportToggle.click();

        const fileInput = page.locator('input[type="file"]');

        // Upload an invalid file
        await fileInput.setInputFiles({
            name: 'invalid.hhr',
            mimeType: 'application/octet-stream',
            buffer: Buffer.from('invalid-passport-content')
        });

        // App should show an error message in the login form
        await expect(page.locator('text=No se pudo leer el archivo pasaporte')).toBeVisible();
    });
});
