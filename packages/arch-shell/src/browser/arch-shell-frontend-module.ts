import { ContainerModule } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, WidgetFactory } from '@theia/core/lib/browser';
import { FilterContribution } from '@theia/core/lib/common';
import { PreferenceContribution } from '@theia/core/lib/common/preferences/preference-schema';
import { ArchHostWidget, createHostWidgetFactory } from './host-widget';
import { ArchShellContribution } from './arch-shell-contribution';
import { ArchStockViewsFilter } from './stock-views-filter';
import { ChannelTransport, EngineConnection, EngineTransport } from './engine/engine-connection';
import { EngineStatusContribution } from './engine/engine-status-contribution';
import { enginePreferenceSchema } from './engine/engine-preferences';

export default new ContainerModule(bind => {
    bind(ArchHostWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => createHostWidgetFactory(ctx.container)).inSingletonScope();
    bind(ArchShellContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(ArchShellContribution);
    bind(FilterContribution).to(ArchStockViewsFilter).inSingletonScope();

    // the engine: one connection, seen by the generated client as its transport (choice 4)
    bind(EngineConnection).toSelf().inSingletonScope();
    bind(ChannelTransport).toSelf().inSingletonScope();
    bind(EngineTransport).toService(ChannelTransport);
    bind(EngineStatusContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(EngineStatusContribution);
    bind(PreferenceContribution).toConstantValue({ schema: enginePreferenceSchema });
});
