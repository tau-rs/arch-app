import { expect, test } from '@playwright/test';

// Issue #1 done criterion: the four regions of spec §4 exist in the shell on first start.
const REGIONS: Record<string, string> = { bar: 'arch.bar', left: 'arch.left', inspector: 'arch.inspector', panel: 'arch.panel' };

test('the shell has the four host regions and no stock Theia views', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#theia-app-shell')).toBeVisible();
    for (const [region, id] of Object.entries(REGIONS)) {
        const host = page.locator(`#${id.replace('.', '\\.')}`);
        await expect(host, `host ${id}`).toBeAttached();
        await expect(host).toHaveAttribute('data-region', region);
    }
    // nothing the spec has no slot for: no file explorer, no scm, no problems view
    for (const stock of ['#files', '#scm-view-container', '#problems']) {
        await expect(page.locator(stock)).toHaveCount(0);
    }
});

// Issue #2 done criterion: with no `arch` binary anywhere, the app starts and says so in the status bar
// (sett's, since #14: the engine state is a sett-status-item).
test('without an engine binary the status bar reads "engine · not found" and nothing blocks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#theia-app-shell')).toBeVisible();
    const item = page.locator('sett-status-bar sett-status-item').getByText('engine · not found');
    await expect(item).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.theia-dialog-container, .theia-notification-list .theia-notification-list-item')).toHaveCount(0);
});
