import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Issues #12 and #14 done criteria: the empty frame is made of sett elements only, in both of sett's themes.
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
            await expect(host(page, 'arch.panel').locator('sett-bottom-panel')).toHaveAttribute('active', 'findings');
        });

        test('the centre is Theia\'s main area inside sett-frame, idle', async ({ page }) => {
            await open(page);
            const frame = host(page, 'arch.centre').locator('sett-frame');
            await expect(frame).toHaveAttribute('state', 'idle');
            await expect(frame.locator('> #theia-main-content-panel')).toBeVisible();
        });

        test('no Theia tab bar is drawn in the right or the bottom area', async ({ page }) => {
            await open(page);
            // Lumino keeps a dock panel's tab bar as a hidden node (single-document mode): none is drawn
            await expect(host(page, 'arch.inspector')).toBeVisible();
            await expect(page.locator('#theia-right-content-panel .lm-TabBar:visible')).toHaveCount(0);
            await expect(page.locator('#theia-right-content-panel .theia-sidepanel-toolbar')).toHaveCount(0);
            await host(page, 'arch.panel').locator('sett-panel-tab[value="terminal"]').click();
            await expect(host(page, 'arch.panel').locator('.xterm')).toBeVisible();
            await expect(host(page, 'arch.panel').locator('.lm-TabBar:visible')).toHaveCount(0);
        });

        test('the inspector folds to its handle, and the handle unfolds it', async ({ page }) => {
            await open(page);
            const inspector = page.locator('sett-inspector');
            await expect(host(page, 'arch.inspector').locator('sett-inspector')).toBeVisible();
            // sett has no fold control on the open inspector (FINDINGS F-17): Theia's command folds it
            await expect(async () => { // the keybindings are bound a moment after the shell shows
                await page.keyboard.press('F1');
                await expect(page.locator('.quick-input-widget')).toBeVisible({ timeout: 1000 });
            }).toPass();
            await page.keyboard.type('Toggle Right Panel');
            await page.locator('.quick-input-list .monaco-list-row', { hasText: 'Toggle Right Panel' }).first().click();
            await expect(inspector).toHaveAttribute('folded', '');
            await expect(inspector).toHaveCount(1);
            await expect(host(page, 'arch.inspector')).toBeHidden();
            const handle = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sett-size-shell-handle').trim());
            expect(`${(await inspector.boundingBox())?.width}px`).toBe(handle);
            await inspector.getByRole('button').click();
            await expect(inspector).not.toHaveAttribute('folded');
            await expect(host(page, 'arch.inspector').locator('sett-inspector')).toBeVisible();
        });

        test('the bottom panel closes to its strip and opens again', async ({ page }) => {
            await open(page);
            const area = host(page, 'arch.panel');
            const panel = area.locator('sett-bottom-panel');
            const strip = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sett-size-shell-strip').trim());
            await expect(panel).not.toHaveAttribute('closed');
            await panel.getByRole('button', { name: 'close the panel' }).click();
            await expect(panel).toHaveAttribute('closed', '');
            await expect.poll(async () => `${(await area.boundingBox())?.height}px`).toBe(strip);
            await expect(panel.locator('sett-panel-tab')).toHaveCount(4);
            await panel.getByRole('button', { name: 'open the panel' }).click();
            await expect(panel).not.toHaveAttribute('closed');
            await expect.poll(async () => (await area.boundingBox())?.height ?? 0).toBeGreaterThan(parseFloat(strip));
        });

        test('the bottom panel opens at one height on a first start and after a reload, shorter than the centre', async ({ page }) => {
            // issue #16: a first start (clean storage) gave the panel more than the centre, a reload gave it Theia's emptySize
            const heights = async () => ({
                panel: (await host(page, 'arch.panel').boundingBox())?.height ?? 0,
                centre: (await host(page, 'arch.centre').boundingBox())?.height ?? 0,
            });
            await open(page);
            const first = await heights();
            expect(first.panel, 'open, above its strip').toBeGreaterThan(parseFloat(await page.evaluate(() =>
                getComputedStyle(document.documentElement).getPropertyValue('--sett-size-shell-strip'))));
            expect(first.panel, 'shorter than the centre').toBeLessThan(first.centre);
            await page.reload();
            await open(page);
            await expect.poll(async () => Math.abs((await heights()).panel - first.panel), 'same height after a reload').toBeLessThanOrEqual(2);
        });

        test('the terminal opens inside the bottom panel, in its terminal slot', async ({ page }) => {
            await open(page);
            const panel = host(page, 'arch.panel').locator('sett-bottom-panel');
            await panel.locator('sett-panel-tab[value="terminal"]').click();
            await expect(panel).toHaveAttribute('active', 'terminal');
            await expect(panel.locator('> [slot="terminal"] .xterm')).toBeVisible();
        });

        test('the status bar is sett-status-bar: the scope item first, then the engine state', async ({ page }) => {
            await open(page);
            const items = page.locator('sett-status-bar > sett-status-item');
            await expect(items.first()).toHaveAttribute('scope', 'main');
            await expect(items.nth(1)).toHaveText('engine · not found', { timeout: 20_000 });
            await expect(items).toHaveCount(2);
            await expect(page.locator('#theia-statusBar')).toHaveCount(0);
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

        test('the whole page passes the accessibility scan', async ({ page }) => {
            await open(page);
            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                .analyze();
            expect(results.passes.length, 'the scan reached the sett elements').toBeGreaterThan(0);
            expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
        });
    });
}
