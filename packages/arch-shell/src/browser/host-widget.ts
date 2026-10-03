import { injectable, inject, interfaces } from '@theia/core/shared/inversify';
import { BaseWidget, WidgetFactory } from '@theia/core/lib/browser';
import { HOST_FACTORY_ID, hostId, Region, RegionName, regionOf } from './regions';
import { ArchLeftView } from './sett/left-view';
import { mountLeft, mountRegion } from './sett/mount';

export interface HostWidgetOptions {
    region: RegionName;
}

/**
 * A host widget is the smallest thing Theia lets you put in an area: an id, a title, one DOM node,
 * nothing drawn of its own. It makes the region exist in the layout and holds the region's sett
 * elements, with no data (sett/mount.ts). It never imitates a sett-* element (HANDOFF §3).
 */
@injectable()
export class ArchHostWidget extends BaseWidget {
    static readonly FACTORY_ID = HOST_FACTORY_ID;

    region!: Region;

    @inject(ArchLeftView)
    protected readonly leftView!: ArchLeftView;

    init(region: Region): void {
        this.region = region;
        this.id = hostId(region.name);
        this.title.label = region.label;
        this.title.caption = region.label;
        this.title.closable = region.closable;
        this.addClass('arch-host');
        this.node.dataset.region = region.name;
        mountRegion(region.name, this.node, this.leftView.view);
        if (region.name === 'left') {
            this.toDispose.push(this.leftView.onDidChange(view => mountLeft(this.node, view)));
        }
    }
}

/** Theia's idiom for a widget factory: a dynamic value closing over the container (inversify 7 has no injectable container). */
export const createHostWidgetFactory = (container: interfaces.Container): WidgetFactory => ({
    id: HOST_FACTORY_ID,
    createWidget(options: HostWidgetOptions): ArchHostWidget {
        const region = regionOf(hostId(options.region));
        if (!region) {
            throw new Error(`arch-shell: unknown region ${options.region}`);
        }
        const widget = container.get(ArchHostWidget); // bound transient: one instance per region
        widget.init(region);
        return widget;
    },
});
