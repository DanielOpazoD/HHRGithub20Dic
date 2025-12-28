import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData } from './fixtures/auth';

test.describe('Medical Signature Flow', () => {
    test('complete journey: sender signs -> link generated -> receiver signs', async ({ page, context }) => {
        // Capture console logs
        page.on('console', msg => {
            if (msg.type() === 'error') console.error(`PAGE ERROR: ${msg.text()}`);
            else console.log(`PAGE LOG: ${msg.text()}`);
        });

        // --- STEP 1: SENDER JOURNEY (Doctor A) ---
        console.log('--- Step 1: Sender Journey ---');
        await injectMockUser(page, 'admin');
        await injectMockData(page);
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        console.log('Verifying census table...');
        await expect(page.locator('table')).toBeVisible();

        console.log('Navigating to Medical Handoff...');
        const medicalHandoffBtn = page.locator('button:has-text("Entrega Turno Médicos")').first();
        await medicalHandoffBtn.click();

        console.log('Waiting for Medical Handoff view...');
        await expect(page.locator('h2:has-text("Entrega de Turno")')).toBeVisible();

        console.log('Filling doctor name...');
        const entregadoPorInput = page.locator('label:has-text("Entregado por")').locator('..').locator('input');
        await entregadoPorInput.fill('Dr. Test Sender');

        console.log('Clicking Firmar...');
        const signBtn = page.locator('button:has-text("Firmar")');
        await signBtn.click();

        console.log('Confirming signature...');
        const confirmBtn = page.locator('button:has-text("Firmar ahora")');
        await confirmBtn.click();

        console.log('Verifying signed state...');
        await expect(page.locator('text=Entregado y firmado')).toBeVisible();

        // --- STEP 2: LINK GENERATION ---
        console.log('--- Step 2: Link Generation ---');
        const shareBtn = page.locator('button[title*="link para firma"]');
        await shareBtn.click();

        const currentUrl = page.url();
        const baseUrl = currentUrl.split('?')[0];
        const todayStr = new Date().toISOString().split('T')[0];
        const signatureUrl = `${baseUrl}?mode=signature&date=${todayStr}`;
        console.log('Generated Signature URL:', signatureUrl);

        // --- STEP 3: RECEIVER JOURNEY (Doctor B) ---
        console.log('--- Step 3: Receiver Journey ---');
        const receiverContext = await context.browser()!.newContext();
        const receiverPage = await receiverContext.newPage();

        receiverPage.on('console', msg => {
            if (msg.type() === 'error') console.error(`RECEIVER ERROR: ${msg.text()}`);
            else console.log(`RECEIVER LOG: ${msg.text()}`);
        });

        // CRITICAL: We need to inject the SAME mock data and a valid passport/user 
        // OR move to offline mode as well for the receiver.
        await injectMockUser(receiverPage, 'viewer'); // Role viewer is enough to sign as receiver
        await injectMockData(receiverPage);          // Must have the record to see it in offline mode

        await receiverPage.goto(signatureUrl);
        await receiverPage.waitForLoadState('domcontentloaded');

        console.log('Verifying receiver view...');
        await expect(receiverPage.locator('h3:has-text("Recepción de Turno Médico")')).toBeVisible();

        console.log('Filling receiver name...');
        const receiverInput = receiverPage.locator('input[placeholder*="Nombre y Apellido"]');
        await receiverInput.fill('Dr. Test Receiver');

        console.log('Clicking Firmar y Recibir...');
        const signAndReceiveBtn = receiverPage.locator('button:has-text("Firmar y Recibir")');
        await signAndReceiveBtn.click();

        console.log('Verifying final state...');
        await expect(receiverPage.locator('text=Entrega Recibida y Firmada')).toBeVisible();
        await expect(receiverPage.locator('text=Dr. Test Receiver').first()).toBeVisible();

        await receiverContext.close();
        console.log('--- Test Completed Successfully ---');
    });
});
