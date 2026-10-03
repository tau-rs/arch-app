import { injectable } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core/lib/common';
import { DEFAULT_RAIL_VIEW, RailView } from './frame';

/** Which view the rail has picked for the left pane. The rail writes it, the left host reads it. */
@injectable()
export class ArchLeftView {
    protected current: RailView = DEFAULT_RAIL_VIEW;
    protected readonly onDidChangeEmitter = new Emitter<RailView>();
    readonly onDidChange: Event<RailView> = this.onDidChangeEmitter.event;

    get view(): RailView {
        return this.current;
    }

    set(view: RailView): void {
        if (view !== this.current) {
            this.current = view;
            this.onDidChangeEmitter.fire(view);
        }
    }
}
