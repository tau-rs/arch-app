import { ContainerModule } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, WidgetFactory } from '@theia/core/lib/browser';
import { FilterContribution } from '@theia/core/lib/common';
import { ArchHostWidget, createHostWidgetFactory } from './host-widget';
import { ArchShellContribution } from './arch-shell-contribution';
import { ArchStockViewsFilter } from './stock-views-filter';

export default new ContainerModule(bind => {
    bind(ArchHostWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => createHostWidgetFactory(ctx.container)).inSingletonScope();
    bind(ArchShellContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(ArchShellContribution);
    bind(FilterContribution).to(ArchStockViewsFilter).inSingletonScope();
});
