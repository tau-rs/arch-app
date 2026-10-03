import { injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { StatusBarImpl } from '@theia/core/lib/browser/status-bar/status-bar';
import { STATUS_ID, STATUS_ITEMS } from './frame';

/**
 * sett's status bar in place of Theia's (DESIGN.md "The shell" rule 8): the scope item first, then the
 * states this app owns. It stays Theia's StatusBar service, so a contribution still calls `setElement`;
 * only the entries named in STATUS_ITEMS are shown, each as a `sett-status-item`. Theia's own entries
 * (the bell, the panel toggle, the caret's place) are verbs or need data: they are not rendered.
 */
@injectable()
export class ArchStatusBar extends StatusBarImpl {

    @postConstruct()
    protected initArch(): void {
        this.id = STATUS_ID; // not `theia-statusBar`: none of Theia's status bar styles apply
    }

    protected override render(): React.JSX.Element {
        const shown = [...this.viewModel.getLeft(), ...this.viewModel.getRight()].filter(e => STATUS_ITEMS.includes(e.id));
        return React.createElement('sett-status-bar', {},
            React.createElement('sett-status-item', { key: 'scope', scope: 'main' }),
            ...shown.map(({ id, entry }) => React.createElement('sett-status-item', {
                key: id,
                'data-item': id,
                title: typeof entry.tooltip === 'string' ? entry.tooltip : undefined,
            }, entry.text)));
    }
}
