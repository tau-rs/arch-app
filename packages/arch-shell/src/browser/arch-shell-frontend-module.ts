import { ContainerModule } from '@theia/core/shared/inversify';
import { ApplicationShell, FrontendApplicationContribution, SidePanelHandler, StatusBar, StatusBarImpl, WidgetFactory } from '@theia/core/lib/browser';
import { FilterContribution } from '@theia/core/lib/common';
import { PreferenceContribution } from '@theia/core/lib/common/preferences/preference-schema';
import { ArchApplicationShell } from './arch-application-shell';
import { ArchHostWidget, createHostWidgetFactory } from './host-widget';
import { ArchShellContribution } from './arch-shell-contribution';
import { ArchStockViewsFilter } from './stock-views-filter';
import { ChannelTransport, EngineConnection, EngineTransport } from './engine/engine-connection';
import { EngineStatusContribution } from './engine/engine-status-contribution';
import { enginePreferenceSchema } from './engine/engine-preferences';
import { ArchStatusBar } from './sett/arch-status-bar';
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

    // sett: its themes and tokens, and its elements in place of Theia's chrome: the rail and the
    // inspector's handle for the side tab bars (F-2), the frame, the bottom panel, the status bar (#14)
    bind(ArchLeftView).toSelf().inSingletonScope();
    bind(SettThemeContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(SettThemeContribution);
    rebind(SidePanelHandler).to(ArchSidePanelHandler);
    rebind(ApplicationShell).to(ArchApplicationShell).inSingletonScope();
    rebind(StatusBarImpl).to(ArchStatusBar).inSingletonScope();
    rebind(StatusBar).toService(StatusBarImpl);

    // the engine: one connection, seen by the generated client as its transport (choice 4)
    bind(EngineConnection).toSelf().inSingletonScope();
    bind(ChannelTransport).toSelf().inSingletonScope();
    bind(EngineTransport).toService(ChannelTransport);
    bind(EngineStatusContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(EngineStatusContribution);
    bind(PreferenceContribution).toConstantValue({ schema: enginePreferenceSchema });
});
