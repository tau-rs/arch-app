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
