import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, StatusBar, StatusBarAlignment } from '@theia/core/lib/browser';
import { PreferenceService } from '@theia/core/lib/common/preferences/preference-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { EngineStatus, engineStatusText } from '../../common/engine-protocol';
import { EngineConnection } from './engine-connection';
import { ENGINE_PATH_PREFERENCE } from './engine-preferences';

export const ENGINE_STATUS_ID = 'arch.engine';

/**
 * Opens the engine for the workspace root once the workspace is known, and mirrors its state in
 * the status bar: a state, never a verb, never a dialog (ADR 23). The Checks row comes with the
 * bottom panel composition (#5).
 */
@injectable()
export class EngineStatusContribution implements FrontendApplicationContribution {

    @inject(EngineConnection) protected readonly engine!: EngineConnection;
    @inject(WorkspaceService) protected readonly workspace!: WorkspaceService;
    @inject(StatusBar) protected readonly statusBar!: StatusBar;
    @inject(PreferenceService) protected readonly preferences!: PreferenceService;

    async onStart(): Promise<void> {
        this.engine.onStatus(s => this.show(s));
        this.show(this.engine.status);
        await this.workspace.ready;
        this.workspace.onWorkspaceChanged(() => this.openRoot());
        await this.openRoot();
    }

    protected async openRoot(): Promise<void> {
        const root = this.workspace.tryGetRoots()[0];
        if (!root) { return; }
        const binaryPath = this.preferences.get<string>(ENGINE_PATH_PREFERENCE, '') || undefined;
        await this.engine.open(root.resource.path.fsPath(), { binaryPath });
    }

    protected show(status: EngineStatus): void {
        const detail = [status.detail, ...(status.looked ?? [])].filter(Boolean).join('\n');
        void this.statusBar.setElement(ENGINE_STATUS_ID, {
            text: engineStatusText(status),
            alignment: StatusBarAlignment.LEFT,
            priority: 1000,
            tooltip: detail || undefined,
            className: `arch-engine-${status.state}`,
        });
    }
}
