import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Issue #12 done criteria: the empty frame is made of sett elements, in both of sett's themes.
const REGION_ELEMENT: Record<string, string> = {
    'arch.bar': 'sett-selector',
    'arch.left': 'sett-scope-line',
    'arch.inspector': 'sett-inspector',
    'arch.panel': 'sett-bottom-panel',
};
const host = (page: Page, id: string) => page.locator(`#${id.replace('.', '\\.')}`);
const themeJson = (scheme: string): { colors: Record<string, string> } =>
    JSON.parse(readFileSync(`node_modules/@tau-rs/sett-tokens/dist/sett-theme.${scheme}.json`, 'utf8'));

const open = async (page: Page): Promise<void> => {
    await page.goto('/');
    await expect(page.locator('#theia-app-shell')).toBeVisible();
    await expect(page.locator('sett-activity-rail')).toBeVisible();
};

for (const scheme of ['light', 'dark'] as const) {
    test.describe(`${scheme} theme`, () => {
        test.use({ colorScheme: scheme });

        test('the four regions hold sett elements, upgraded and visible', async ({ page }) => {
            await open(page);
            for (const [id, tag] of Object.entries(REGION_ELEMENT)) {
                const element = host(page, id).locator(tag);
                await expect(element, `${tag} in ${id}`).toBeVisible();
                expect(await element.evaluate(e => !!e.shadowRoot), `${tag} is a defined custom element`).toBe(true);
            }
            await expect(host(page, 'arch.panel').locator('sett-panel-tab')).toHaveText(['Findings', 'Checks', 'Terminal', "What's new"]);
        });

        test('the rail shows three labelled items in place of the left tab bar', async ({ page }) => {
            await open(page);
            const items = page.locator('sett-activity-rail sett-rail-item');
            await expect(items).toHaveText(['Sessions', 'Files', 'Findings']);
            for (const item of await items.all()) {
                await expect(item).toBeVisible();
            }
            await expect(page.locator('#theia-left-content-panel .theia-app-sides')).toHaveCount(0);
        });

        test('the rail picks the left view, and the active item pressed again closes the pane', async ({ page }) => {
            await open(page);
            const left = host(page, 'arch.left');
            const files = page.locator('sett-rail-item[value="files"]');
            await expect(left.locator('sett-sessions-view')).toBeVisible();
            await files.click();
            await expect(left.locator('sett-files-view')).toBeVisible();
            await expect(files).toHaveAttribute('active', '');
            await files.click();
            await expect(left).toBeHidden();
            await expect(page.locator('sett-activity-rail')).toBeVisible();
            await expect(page.locator('sett-activity-rail')).toHaveAttribute('closed', '');
            await files.click();
            await expect(left.locator('sett-files-view')).toBeVisible();
        });

        test(`sett's ${scheme} theme and tokens are the ones loaded`, async ({ page }) => {
            await open(page);
            await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
            const [editorBackground, settToken] = await page.evaluate(() => {
                const style = getComputedStyle(document.documentElement);
                return [style.getPropertyValue('--theia-editor-background').trim(), style.getPropertyValue('--sett-size-shell-rail').trim()];
            });
            expect(editorBackground.toLowerCase()).toBe(themeJson(scheme).colors['editor.background'].toLowerCase());
            expect(settToken).not.toBe('');
        });

        // The gate is WCAG 2.1 A/AA on what this repo composes: the four regions and the rail.
        // Theia's own chrome fails three rules on its tab bars and status items (FINDINGS F-15).
        test('the sett regions and the rail pass the accessibility scan', async ({ page }) => {
            await open(page);
            const results = await new AxeBuilder({ page })
                .include('.arch-host').include('.arch-rail-host')
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                .analyze();
            expect(results.passes.length, 'the scan reached the sett elements').toBeGreaterThan(0);
            expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
        });
    });
}
