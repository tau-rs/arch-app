import { injectable, inject } from '@theia/core/shared/inversify';
import { Panel, SidePanelHandler, Widget } from '@theia/core/lib/browser';
import { hostId } from '../regions';
import { isRailView } from './frame';
import { ArchLeftView } from './left-view';
import { createRail, markRail } from './mount';

/**
 * The left side panel with sett's activity rail in place of Theia's vertical tab bar (FINDINGS F-2).
 * Theia builds each side panel through `SidePanelHandler`, a class it binds in the container, so the
 * rebind is a subclass: no upstream hook is needed. Theia's tab bar stays as the model (it still says
 * which widget is open and whether the pane is collapsed); it is only taken out of the DOM, with the
 * sidebar's icon-only menus and the title toolbar, which the spec's left pane has no slot for.
 * The right panel is Theia's, untouched.
 */
@injectable()
export class ArchSidePanelHandler extends SidePanelHandler {

    @inject(ArchLeftView)
    protected readonly leftView!: ArchLeftView;

    protected override createContainer(): Panel {
        const container = super.createContainer();
        if (this.side !== 'left') {
            return container;
        }
        const sidebar = this.tabBar.parent as Panel;
        for (const stock of [this.topMenu, this.tabBar, this.additionalViewsMenu, this.bottomMenu, this.toolBar]) {
            stock.parent = null; // eslint-disable-line no-null/no-null
        }

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
        return container;
    }
}
