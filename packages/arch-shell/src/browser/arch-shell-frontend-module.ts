import { ContainerModule } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, SidePanelHandler, WidgetFactory } from '@theia/core/lib/browser';
import { FilterContribution } from '@theia/core/lib/common';
import { PreferenceContribution } from '@theia/core/lib/common/preferences/preference-schema';
import { ArchHostWidget, createHostWidgetFactory } from './host-widget';
import { ArchShellContribution } from './arch-shell-contribution';
import { ArchStockViewsFilter } from './stock-views-filter';
import { ChannelTransport, EngineConnection, EngineTransport } from './engine/engine-connection';
import { EngineStatusContribution } from './engine/engine-status-contribution';
import { enginePreferenceSchema } from './engine/engine-preferences';
import { ArchLeftView } from './sett/left-view';
import { ArchSidePanelHandler } from './sett/rail-side-panel-handler';
import { SettThemeContribution } from './sett/sett-theme-contribution';
import '../../src/browser/style/frame.css';

export default new ContainerModule((bind, _unbind, _isBound, rebind) => {
    bind(ArchHostWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => createHostWidgetFactory(ctx.container)).inSingletonScope();
    bind(ArchShellContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(ArchShellContribution);
    bind(FilterContribution).to(ArchStockViewsFilter).inSingletonScope();

    // sett: its themes and tokens, and its activity rail in place of the left tab bar (F-2)
    bind(ArchLeftView).toSelf().inSingletonScope();
    bind(SettThemeContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(SettThemeContribution);
    rebind(SidePanelHandler).to(ArchSidePanelHandler);

    // the engine: one connection, seen by the generated client as its transport (choice 4)
    bind(EngineConnection).toSelf().inSingletonScope();
    bind(ChannelTransport).toSelf().inSingletonScope();
    bind(EngineTransport).toService(ChannelTransport);
    bind(EngineStatusContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(EngineStatusContribution);
    bind(PreferenceContribution).toConstantValue({ schema: enginePreferenceSchema });
});
