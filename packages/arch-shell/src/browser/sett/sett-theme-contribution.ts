import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { MonacoThemingService } from '@theia/monaco/lib/browser/monaco-theming-service';
import '@tau-rs/sett-tokens/sett.css';

export const SETT_LIGHT = 'sett-light';
export const SETT_DARK = 'sett-dark';

/**
 * sett's generated colour themes are the app's themes, and sett's tokens follow the active one.
 * The application config names them as the defaults (`defaultTheme`), so a first start picks the
 * one matching the OS. sett.css switches its tokens on `data-theme`, which mirrors Theia's theme type.
 */
@injectable()
export class SettThemeContribution implements FrontendApplicationContribution {

    @inject(MonacoThemingService)
    protected readonly monacoThemes!: MonacoThemingService;

    @inject(ThemeService)
    protected readonly themes!: ThemeService;

    initialize(): void {
        const stored = window.localStorage.getItem(ThemeService.STORAGE_KEY);
        this.monacoThemes.registerParsedTheme({
            id: SETT_LIGHT, label: 'sett light', uiTheme: 'vs', json: require('@tau-rs/sett-tokens/sett-theme.light.json'),
        });
        this.monacoThemes.registerParsedTheme({
            id: SETT_DARK, label: 'sett dark', uiTheme: 'vs-dark', json: require('@tau-rs/sett-tokens/sett-theme.dark.json'),
        });
        if (!stored || stored === SETT_LIGHT || stored === SETT_DARK) {
            this.themes.setCurrentTheme(stored ?? this.themes.defaultTheme.id, false);
        }
        this.mirror();
        this.themes.onDidColorThemeChange(() => this.mirror());
    }

    protected mirror(): void {
        const type = this.themes.getCurrentTheme().type;
        document.documentElement.dataset.theme = type === 'light' || type === 'hcLight' ? 'light' : 'dark';
    }
}
