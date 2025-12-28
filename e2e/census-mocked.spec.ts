/**
 * E2E Tests: Census View with Mocked Auth
 * Tests the census view functionality with mock authentication and data.
 */

import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData } from './fixtures/auth';

test.describe('Census View (Authenticated)', () => {
    test.beforeEach(async ({ page }) => {
        // Inject mock editor user and data before navigating
        await injectMockUser(page, 'editor');
        await injectMockData(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
    });

    test('should display census view and loaded data', async ({ page }) => {
        // Should see the census table
        const censusTable = page.locator('table');
        await expect(censusTable).toBeVisible();

        // Verify regular beds are visible (18 regular beds)
        const bedRows = page.locator('tbody tr');
        // We expect 18 regular beds (R1-R4, NEO1-2, H1-6C1-2)
        await expect(bedRows).toHaveCount(18);
    });

    test('should show date navigation', async ({ page }) => {
        // Date navigation should be visible and showing current month
        const today = new Date();
        const monthNames = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        const currentMonthName = monthNames[today.getMonth()];

        await expect(page.locator(`text=${currentMonthName}`)).toBeVisible();
        await expect(page.locator(`text=${today.getFullYear()}`)).toBeVisible();
    });

    test('should display hospital capacity stats', async ({ page }) => {
        // Summary card title should be visible
        await expect(page.locator('text=Censo Camas')).toBeVisible();
        await expect(page.locator('text=Recursos Cuna')).toBeVisible();
    });
});

test.describe('Census View Permissions', () => {
    test('editor should have editable inputs', async ({ page }) => {
        await injectMockUser(page, 'editor');
        await injectMockData(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Find patient name input for bed R1
        const patientInput = page.locator('tr:has-text("R1")').locator('input[type="text"]').first();
        await expect(patientInput).toBeEnabled();

        // Type something
        await patientInput.fill('Test Patient');
        await expect(patientInput).toHaveValue('Test Patient');
    });

    test('viewer should have disabled inputs', async ({ page }) => {
        await injectMockUser(page, 'viewer');
        await injectMockData(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Inputs should be disabled for viewer
        const patientInput = page.locator('tr:has-text("R1")').locator('input[type="text"]').first();
        await expect(patientInput).toBeDisabled();
    });
});

test.describe('Export Functionality', () => {
    test('should have export button visible for editor', async ({ page }) => {
        await injectMockUser(page, 'editor');
        await injectMockData(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Look for export buttons
        const exportButton = page.locator('button:has-text("EXCEL")');
        await expect(exportButton).toBeVisible();
    });
});

test.describe('Logout Flow', () => {
    test('should clear session on logout', async ({ page }) => {
        await injectMockUser(page, 'editor');
        await injectMockData(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Click the Hanga Roa button to open menu if needed, or find the logout icon directly.
        // Usually logout is in the upper right.
        const logoutButton = page.locator('button:has(svg.lucide-log-out), button:has-text("Cerrar sesión")').first();

        if (await logoutButton.isVisible()) {
            await logoutButton.click();

            // Should redirect to login page
            await expect(page.locator('input[type="email"]')).toBeVisible();

            // localStorage should be cleared
            const afterLogout = await page.evaluate(() => localStorage.getItem('hhr_offline_user'));
            expect(afterLogout).toBeNull();
        }
    });
});
