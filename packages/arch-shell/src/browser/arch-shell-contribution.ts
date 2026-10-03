import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplication, FrontendApplicationContribution, WidgetManager } from '@theia/core/lib/browser';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { CommandService } from '@theia/core/lib/common';
import { ArchApplicationShell } from './arch-application-shell';
import { HOST_FACTORY_ID, HOSTED_REGIONS } from './regions';
import { ArchHostWidget, HostWidgetOptions } from './host-widget';
import { isPanelTab } from './sett/frame';

/** Theia's own command for a new terminal; by id, so the shell does not depend on `@theia/terminal` */
const NEW_TERMINAL = 'terminal:new';

/**
 * Puts one host widget in each hosted region, and makes the bottom panel answer what it reports.
 * `initializeLayout` runs on a first start with no saved layout; `onStart` runs on every start, so a
 * region deleted from a saved layout comes back: the frame never loses a region. Nothing here awaits
 * visibility: during `initializeLayout` the shell is not in the DOM yet, and awaiting a reveal there
 * would hang the whole start sequence.
 */
@injectable()
export class ArchShellContribution implements FrontendApplicationContribution {

    @inject(WidgetManager)
    protected readonly widgets!: WidgetManager;

    @inject(CommandService)
    protected readonly commands!: CommandService;

    @inject(FrontendApplicationStateService)
    protected readonly appState!: FrontendApplicationStateService;

    async initializeLayout(app: FrontendApplication): Promise<void> {
        await this.ensureHosts(app);
    }

    async onStart(app: FrontendApplication): Promise<void> {
        await this.ensureHosts(app);
        this.bindPanel(app.shell as ArchApplicationShell);
        for (const area of ['left', 'right', 'bottom'] as const) {
            app.shell.expandPanel(area);
        }
    }

    protected async ensureHosts(app: FrontendApplication): Promise<void> {
        for (const region of HOSTED_REGIONS) {
            const options: HostWidgetOptions = { region: region.name };
            const host = await this.widgets.getOrCreateWidget<ArchHostWidget>(HOST_FACTORY_ID, options);
            if (!host.isAttached) {
                await app.shell.addWidget(host, { area: region.area });
            }
        }
    }

    /**
     * sett's bottom panel reports and never changes itself. A chosen tab becomes `active` and opens the
     * panel; the caret opens or closes Theia's bottom area, which is what sets `closed`. The Terminal
     * tab's body is Theia's bottom area: a terminal opened there shows that tab (not the one Theia opens
     * or restores while starting: the panel starts on its first tab), and choosing the tab with no
     * terminal opens one (there is no empty state to show instead, FINDINGS F-14).
     */
    protected bindPanel(shell: ArchApplicationShell): void {
        const panel = shell.panel.element;
        const show = (tab: string): void => {
            panel.setAttribute('active', tab);
            shell.expandPanel('bottom');
            shell.panel.remeasure();
        };
        panel.addEventListener('sett-select', e => {
            const { value } = (e as CustomEvent<{ value: string }>).detail;
            if (!isPanelTab(value)) {
                return;
            }
            show(value);
            if (value === 'terminal' && shell.bottomPanel.isEmpty) {
                void this.commands.executeCommand(NEW_TERMINAL);
            }
        });
        panel.addEventListener('sett-toggle', e => {
            if ((e as CustomEvent<{ closed: boolean }>).detail.closed) {
                void shell.collapsePanel('bottom');
            } else {
                shell.expandPanel('bottom');
            }
        });
        shell.bottomPanel.widgetAdded.connect(() => {
            if (this.appState.state === 'ready') {
                show('terminal');
            }
        });
    }
}
