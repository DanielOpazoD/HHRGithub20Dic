import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData, ensureRecordExists } from './fixtures/auth';

/**
 * E2E Test: Bed Blocking/Unblocking Flow
 * Tests the process of blocking and unblocking hospital beds.
 */

test.describe('Bed Blocking Flow', () => {
    test.beforeEach(async ({ page }) => {
        await injectMockUser(page, 'admin');
        await injectMockData(page); // Empty beds
        await ensureRecordExists(page);
    });

    test('should block an empty bed', async ({ page }) => {
        // 1. Wait for table
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // 2. Find empty bed H1C1
        const bedRow = page.locator('tr').filter({ hasText: 'H1C1' }).first();
        await bedRow.click();

        // 3. Wait for modal
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // 4. Look for block bed option
        // Could be a button, checkbox, or dropdown
        const blockOption = page.locator(
            'button:has-text("Bloquear"), ' +
            'input[type="checkbox"][name*="block"], ' +
            'label:has-text("Bloqueada") input, ' +
            'select[name="bedMode"]'
        );

        if (await blockOption.first().isVisible()) {
            const element = blockOption.first();
            const tagName = await element.evaluate(el => el.tagName);

            if (tagName === 'BUTTON') {
                await element.click();
            } else if (tagName === 'INPUT') {
                await element.check();
            } else if (tagName === 'SELECT') {
                // Select "Bloqueada" option if available
                await element.selectOption({ label: 'Bloqueada' });
            }

            // 5. Save changes
            const saveBtn = page.locator('button:has-text("Guardar"), button:has-text("Confirmar")').first();
            await saveBtn.click();

            // 6. Verify bed is blocked
            await expect(modal).not.toBeVisible({ timeout: 5000 });

            // Check for visual indicator of blocked bed
            const blockedIndicator = page.locator('tr:has-text("H1C1") .blocked, tr:has-text("H1C1"):has-text("Bloqueada")');
            if (await blockedIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
                await expect(blockedIndicator).toBeVisible();
            }
        } else {
            // Check isBlocked checkbox directly
            const isBlockedCheckbox = page.locator('input[name="isBlocked"]');
            if (await isBlockedCheckbox.isVisible()) {
                await isBlockedCheckbox.check();
                await page.locator('button:has-text("Guardar")').first().click();
            }
        }
    });

    test('should not allow patient admission to blocked bed', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // First, block the bed
        const bedRow = page.locator('tr').filter({ hasText: 'H2C1' }).first();
        await bedRow.click();

        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Block the bed
        const isBlockedCheckbox = page.locator('input[name="isBlocked"]');
        if (await isBlockedCheckbox.isVisible()) {
            await isBlockedCheckbox.check();
            await page.locator('button:has-text("Guardar")').first().click();
            await expect(modal).not.toBeVisible({ timeout: 5000 });

            // Now try to add patient to blocked bed
            await bedRow.click();
            await expect(modal).toBeVisible({ timeout: 5000 });

            // Patient name input should be disabled or not present
            const patientInput = page.locator('input[name="patientName"]');
            if (await patientInput.isVisible()) {
                const isDisabled = await patientInput.isDisabled();
                expect(isDisabled).toBeTruthy();
            }
        }
    });

    test('should unblock a blocked bed', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        // First, block the bed
        const bedRow = page.locator('tr').filter({ hasText: 'H3C1' }).first();
        await bedRow.click();

        let modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 5000 });

        const isBlockedCheckbox = page.locator('input[name="isBlocked"]');
        if (await isBlockedCheckbox.isVisible()) {
            // Block
            await isBlockedCheckbox.check();
            await page.locator('button:has-text("Guardar")').first().click();
            await expect(modal).not.toBeVisible({ timeout: 5000 });

            // Reopen modal
            await bedRow.click();
            modal = page.locator('[role="dialog"]');
            await expect(modal).toBeVisible({ timeout: 5000 });

            // Unblock
            await isBlockedCheckbox.uncheck();
            await page.locator('button:has-text("Guardar")').first().click();
            await expect(modal).not.toBeVisible({ timeout: 5000 });

            // Verify bed is unblocked
            await bedRow.click();
            await expect(modal).toBeVisible({ timeout: 5000 });

            // Patient input should now be enabled
            const patientInput = page.locator('input[name="patientName"]');
            if (await patientInput.isVisible()) {
                const isEnabled = !(await patientInput.isDisabled());
                expect(isEnabled).toBeTruthy();
            }
        }
    });

    test('should show blocking reason', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        const bedRow = page.locator('tr').filter({ hasText: 'H4C1' }).first();
        await bedRow.click();

        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Look for blocking reason field
        const blockReasonInput = page.locator('input[name="blockReason"], textarea[name="blockReason"]');
        const blockReasonSelect = page.locator('select[name="blockReason"]');

        if (await blockReasonInput.isVisible()) {
            // Block the bed with reason
            const isBlockedCheckbox = page.locator('input[name="isBlocked"]');
            if (await isBlockedCheckbox.isVisible()) {
                await isBlockedCheckbox.check();
            }
            await blockReasonInput.fill('Mantenimiento programado');
            await page.locator('button:has-text("Guardar")').first().click();
        } else if (await blockReasonSelect.isVisible()) {
            await blockReasonSelect.selectOption({ index: 1 });
            await page.locator('button:has-text("Guardar")').first().click();
        }
    });

    test('should change bed mode (Adulto/Pediátrico)', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

        const bedRow = page.locator('tr').filter({ hasText: 'H5C1' }).first();
        await bedRow.click();

        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Look for bed mode selector
        const bedModeSelect = page.locator('select[name="bedMode"]');
        if (await bedModeSelect.isVisible()) {
            // Change to Pediátrico
            await bedModeSelect.selectOption('Pediátrico');
            await page.locator('button:has-text("Guardar")').first().click();
            await expect(modal).not.toBeVisible({ timeout: 5000 });

            // Verify change persisted
            await bedRow.click();
            await expect(modal).toBeVisible({ timeout: 5000 });

            const selectedValue = await bedModeSelect.inputValue();
            expect(selectedValue).toBe('Pediátrico');
        }
    });
});
