import { MessageLoop } from '@theia/core/shared/@lumino/messaging';
import { Panel, PanelLayout, Widget } from '@theia/core/shared/@lumino/widgets';

/**
 * A Lumino layout whose children's nodes go inside a sett element instead of the parent's own node:
 * the widget stays Theia's (same instance, same messages), and its DOM becomes the element's slotted
 * content. Sizes are CSS's (style/frame.css): the children re-measure themselves on every resize.
 */
class SlotLayout extends PanelLayout {

    constructor(protected readonly element: HTMLElement, protected readonly slotName?: string) {
        super();
    }

    protected override attachWidget(_index: number, widget: Widget): void {
        const attached = !!this.parent?.isAttached;
        if (this.slotName) {
            widget.node.slot = this.slotName;
        }
        if (attached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
        }
        this.element.appendChild(widget.node);
        if (attached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
        }
    }

    protected override moveWidget(): void {
        // one slot, no order to keep
    }

    protected override detachWidget(_index: number, widget: Widget): void {
        const attached = !!this.parent?.isAttached;
        if (attached) {
            MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
        }
        widget.node.remove();
        widget.node.removeAttribute('slot');
        if (attached) {
            MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
        }
    }
}

/** A widget that is one sett element, with Theia widgets as that element's slotted content. */
export class ArchSlotHost extends Panel {

    constructor(readonly element: HTMLElement, slotName?: string) {
        super({ layout: new SlotLayout(element, slotName) });
        this.addClass('arch-host');
        this.node.append(element);
    }

    /** asks the slotted widgets to measure themselves again, once the element has rendered its slot */
    remeasure(): void {
        requestAnimationFrame(() => {
            for (const widget of this.widgets) {
                MessageLoop.sendMessage(widget, Widget.ResizeMessage.UnknownSize);
            }
        });
    }
}
