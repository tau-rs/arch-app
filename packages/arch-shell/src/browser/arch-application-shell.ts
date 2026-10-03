import { injectable } from '@theia/core/shared/inversify';
import { MessageLoop } from '@theia/core/shared/@lumino/messaging';
import { Layout, SplitPanel, Widget } from '@theia/core/shared/@lumino/widgets';
import { ApplicationShell, SplitPositionOptions } from '@theia/core/lib/browser';
import { hostId } from './regions';
import { createFrame, createPanel } from './sett/mount';
import { ArchSlotHost } from './sett/slot-host';

export const CENTRE_ID = 'arch.centre';

/**
 * Theia's shell with two of its areas held by sett elements (issue #14). The areas stay Theia's own
 * dock panels, so `addWidget(widget, { area })` still lands an editor in the centre and a terminal in
 * the bottom area; only what is drawn around them changes:
 *
 *   centre  → `sett-frame` (idle) around the main area
 *   bottom  → `sett-bottom-panel`, the bottom dock panel in its `terminal` slot, no Theia tab bar
 *
 * Collapsed, Theia hides the bottom dock panel; here the panel stays as its strip (`closed`).
 * Watch on Theia upgrades: `createLayout` and the bottom panel's size methods are protected members.
 */
@injectable()
export class ArchApplicationShell extends ApplicationShell {

    centre!: ArchSlotHost;
    panel!: ArchSlotHost;

    /** the open panel holds its default size and the shell is still starting: it keeps the ratio as the column settles */
    protected panelAtRatio = false;

    protected override createLayout(): Layout {
        const layout = super.createLayout();
        const split = this.bottomPanel.parent as SplitPanel;

        this.centre = new ArchSlotHost(createFrame());
        this.centre.id = CENTRE_ID;
        this.centre.node.dataset.region = 'centre';
        this.centre.addWidget(this.mainPanel);

        this.panel = new ArchSlotHost(createPanel(), 'terminal');
        this.panel.id = hostId('panel');
        this.panel.node.dataset.region = 'panel';
        this.bottomPanel.mode = 'single-document'; // one terminal at a time, and no tab bar
        this.panel.addWidget(this.bottomPanel);
        this.markPanel();

        SplitPanel.setStretch(this.centre, 1);
        SplitPanel.setStretch(this.panel, 0);
        split.addWidget(this.centre);
        split.addWidget(this.panel);

        // sett's bar and status bar render after the panel first opens, and the column shrinks by their height (issue #16)
        MessageLoop.installMessageHook(split, (_handler, msg) => {
            if (msg.type === 'resize' && this.panelAtRatio) {
                this.openAtRatio();
            }
            return true;
        });
        void this.applicationStateService.reachedState('ready').then(() => this.panelAtRatio = false);
        return layout;
    }

    /** `closed` on sett's panel follows Theia's collapsed state, and the area shrinks to the strip (frame.css) */
    protected markPanel(): void {
        const closed = this.bottomPanel.isHidden;
        this.panel.element.toggleAttribute('closed', closed);
        this.panel.toggleClass('arch-closed', closed);
        if (this.panel.parent) {
            MessageLoop.sendMessage(this.panel.parent, Widget.Msg.FitRequest);
        }
        this.panel.remeasure();
    }

    protected override expandBottomPanel(): void {
        if (this.bottomPanel.isHidden) {
            // the strip's height limit goes before Theia sets the open size
            this.panel.element.removeAttribute('closed');
            this.panel.removeClass('arch-closed');
            MessageLoop.sendMessage(this.panel.parent!, Widget.Msg.FitRequest);
            // Theia opens a bottom area with no terminal at `emptySize`; sett's panel always has its tabs, so it opens at the ratio
            if (this.bottomPanelState.lastPanelSize === undefined) {
                this.bottomPanelState.lastPanelSize = this.getDefaultBottomPanelSize();
                this.panelAtRatio = this.applicationStateService.state !== 'ready';
            }
        }
        super.expandBottomPanel();
        this.markPanel();
    }

    protected openAtRatio(): void {
        const size = this.getDefaultBottomPanelSize();
        if (size && !this.bottomPanel.isHidden) {
            this.bottomPanelState.lastPanelSize = size;
            void this.setBottomPanelSize(size);
        }
    }

    protected override async collapseBottomPanel(): Promise<void> {
        this.panelAtRatio = false;
        await super.collapseBottomPanel();
        this.markPanel();
    }

    // Theia measures and sizes the bottom dock panel as a child of the split panel; that child is now the sett panel.

    protected override getBottomPanelSize(): number | undefined {
        const parent = this.panel.parent;
        if (parent instanceof SplitPanel && parent.isVisible) {
            const handle = parent.handles[parent.widgets.indexOf(this.panel) - 1];
            return handle ? parent.node.clientHeight - handle.offsetTop : undefined;
        }
    }

    protected override getDefaultBottomPanelSize(): number | undefined {
        const parent = this.panel.parent;
        if (parent && parent.isVisible) {
            return parent.node.clientHeight * this.options.bottomPanel.initialSizeRatio;
        }
    }

    protected override setBottomPanelSize(size: number): Promise<void> {
        const options: SplitPositionOptions = {
            side: 'bottom',
            duration: this.applicationStateService.state === 'ready' ? this.options.bottomPanel.expandDuration : 0,
            referenceWidget: this.panel,
        };
        const result = this.splitPositionHandler.setSidePanelSize(this.panel, size, options).then(() => undefined, () => undefined);
        this.bottomPanelState.pendingUpdate = this.bottomPanelState.pendingUpdate.then(() => result);
        return result;
    }

    /** Theia maximizes an area by lifting it out of its split panel; the frame and the panel stay where they are. */
    override doToggleMaximized(): void {
        // no maximized state in the spec §4 frame
    }
}
