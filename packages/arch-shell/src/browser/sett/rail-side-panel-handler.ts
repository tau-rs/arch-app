import { injectable, inject } from '@theia/core/shared/inversify';
import { Panel, SidePanelHandler, Widget } from '@theia/core/lib/browser';
import { hostId } from '../regions';
import { isRailView } from './frame';
import { ArchLeftView } from './left-view';
import { createRail, markRail } from './mount';

/**
 * The side panels without Theia's chrome (FINDINGS F-2). Theia builds each side panel through
 * `SidePanelHandler`, a class it binds in the container, so the rebind is a subclass: no upstream hook
 * is needed. Theia's tab bar stays as the model (it still says which widget is open and whether the
 * pane is collapsed); it is only taken out of the DOM, with the sidebar's icon-only menus and the
 * title toolbar, which the spec's panes have no slot for.
 *
 *   left   → sett's activity rail in the sidebar column
 *   right  → nothing while the inspector is open; collapsed, the inspector itself, `folded`, is the
 *            column: its 28 px handle, whose `sett-unfold` opens the pane again
 */
@injectable()
export class ArchSidePanelHandler extends SidePanelHandler {

    @inject(ArchLeftView)
    protected readonly leftView!: ArchLeftView;

    /** right side only: where the folded inspector stands while the pane is collapsed */
    protected handleHost: Widget | undefined;
    protected inspector: HTMLElement | undefined;

    protected override createContainer(): Panel {
        const container = super.createContainer();
        const sidebar = this.tabBar.parent as Panel;
        for (const stock of [this.topMenu, this.tabBar, this.additionalViewsMenu, this.bottomMenu, this.toolBar]) {
            stock.parent = null; // eslint-disable-line no-null/no-null
        }
        if (this.side === 'left') {
            this.createRail(sidebar);
        } else {
            this.createHandle(sidebar);
        }
        return container;
    }

    protected createRail(sidebar: Panel): void {
        const rail = createRail(this.leftView.view);
        const railHost = new Widget();
        railHost.id = 'arch.rail';
        railHost.addClass('arch-rail-host');
        railHost.node.append(rail);
        sidebar.addWidget(railHost);

        const closed = (): boolean => !this.tabBar.currentTitle;
        const mark = (): void => markRail(rail, this.leftView.view, closed());
        this.tabBar.currentChanged.connect(mark);
        this.leftView.onDidChange(mark);
        rail.addEventListener('sett-view', e => {
            const { value, active } = (e as CustomEvent<{ value: string; active: boolean }>).detail;
            if (!isRailView(value)) {
                return;
            }
            if (active && !closed()) {
                this.collapse(); // the active item pressed again closes the pane; the rail stays
            } else {
                this.leftView.set(value);
                this.expand(hostId('left'));
            }
        });
    }

    protected createHandle(sidebar: Panel): void {
        const handleHost = new Widget();
        handleHost.id = 'arch.inspector-handle';
        handleHost.addClass('arch-handle-host');
        handleHost.hide();
        handleHost.node.addEventListener('sett-unfold', () => this.expand(hostId('inspector')));
        sidebar.addWidget(handleHost);
        this.handleHost = handleHost;
    }

    /** one inspector element: in its host widget while open, in the sidebar column, `folded`, while collapsed */
    override refresh(): void {
        super.refresh();
        if (!this.handleHost) {
            return;
        }
        const host = this.dockPanel.node.querySelector<HTMLElement>(`[id="${hostId('inspector')}"]`);
        this.inspector ??= host?.querySelector<HTMLElement>('sett-inspector') ?? undefined;
        if (!host || !this.inspector) {
            return;
        }
        const folded = !this.tabBar.currentTitle;
        this.inspector.toggleAttribute('folded', folded);
        (folded ? this.handleHost.node : host).append(this.inspector);
        this.handleHost.setHidden(!folded);
    }
}
