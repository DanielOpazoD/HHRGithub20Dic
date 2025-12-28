/**
 * E2E Tests: Date Navigation & Data Entry
 * Tests date switching and patient data entry workflows.
 */

import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData } from './fixtures/auth';

test.describe('Date Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockUser(page, 'editor');
        await injectMockData(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
    });

    test('should display current month and year', async ({ page }) => {
        const today = new Date();
        const monthNames = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        const currentMonthName = monthNames[today.getMonth()];

        await expect(page.locator(`text=${currentMonthName}`)).toBeVisible();
        await expect(page.locator(`text=${today.getFullYear()}`)).toBeVisible();
    });

    test('should have navigation buttons for days', async ({ page }) => {
        // Should see day numbers
        const today = new Date().getDate();
        await expect(page.locator(`button:has-text("${today}")`).first()).toBeVisible();
    });
});

test.describe('Patient Data Entry', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockUser(page, 'editor');
        await injectMockData(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
    });

    test('should allow typing in patient data fields', async ({ page }) => {
        // Select bed R1
        const row = page.locator('tr:has-text("R1")');

        // Name
        const nameInput = row.locator('input[type="text"]').first();
        await nameInput.fill('JUAN PEREZ');
        await expect(nameInput).toHaveValue('JUAN PEREZ');

        // RUT
        const rutInput = row.locator('input[type="text"]').nth(1);
        await rutInput.fill('12345678');
        // App might format it
        const value = await rutInput.inputValue();
        expect(value.length).toBeGreaterThan(0);

        // Diagnosis
        const diagInput = row.locator('input[type="text"]').nth(3);
        await diagInput.fill('NEUMONIA');
        await expect(diagInput).toHaveValue('NEUMONIA');
    });

    test('should show save indicator after typing', async ({ page }) => {
        const nameInput = page.locator('tr:has-text("R1")').locator('input[type="text"]').first();
        await nameInput.fill('Auto Save Test');

        // Wait for sync status to change (should show OFFLINE since we are in offline mode)
        const statusBadge = page.locator('text=OFFLINE');
        await expect(statusBadge).toBeVisible();
    });
});

test.describe('Mobile Responsiveness', () => {
    test('should render correctly on iPhone viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await injectMockUser(page, 'editor');
        await injectMockData(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const root = page.locator('#root');
        await expect(root).toBeVisible();
    });
});
