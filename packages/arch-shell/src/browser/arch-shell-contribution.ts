import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplication, FrontendApplicationContribution, WidgetManager } from '@theia/core/lib/browser';
import { HOST_FACTORY_ID, REGIONS } from './regions';
import { ArchHostWidget, HostWidgetOptions } from './host-widget';

/**
 * Puts one host widget in each of the four regions. `initializeLayout` runs on a first start with no
 * saved layout; `onStart` runs on every start, so a region deleted from a saved layout comes back:
 * the frame never loses a region. Nothing here awaits visibility: during `initializeLayout` the shell
 * is not in the DOM yet, and awaiting a reveal there would hang the whole start sequence.
 */
@injectable()
export class ArchShellContribution implements FrontendApplicationContribution {

    @inject(WidgetManager)
    protected readonly widgets!: WidgetManager;

    async initializeLayout(app: FrontendApplication): Promise<void> {
        await this.ensureHosts(app);
    }

    async onStart(app: FrontendApplication): Promise<void> {
        await this.ensureHosts(app);
        for (const area of ['left', 'right', 'bottom'] as const) {
            app.shell.expandPanel(area);
        }
    }

    protected async ensureHosts(app: FrontendApplication): Promise<void> {
        for (const region of REGIONS) {
            const options: HostWidgetOptions = { region: region.name };
            const host = await this.widgets.getOrCreateWidget<ArchHostWidget>(HOST_FACTORY_ID, options);
            if (!host.isAttached) {
                await app.shell.addWidget(host, { area: region.area });
            }
        }
    }
}
