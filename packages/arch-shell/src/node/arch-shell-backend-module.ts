import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, RpcConnectionHandler } from '@theia/core/lib/common';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { ENGINE_BRIDGE_PATH, EngineBridgeClient } from '../common/engine-protocol';
import { EngineHost } from './engine-host';
import { EngineBridgeImpl } from './engine-bridge';

export default new ContainerModule(bind => {
    bind(EngineHost).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(EngineHost);
    bind(EngineBridgeImpl).toSelf();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler<EngineBridgeClient>(ENGINE_BRIDGE_PATH, client => {
            const bridge = ctx.container.get(EngineBridgeImpl);
            bridge.setClient(client);
            client.onDidCloseConnection(() => bridge.dispose());
            return bridge;
        })
    ).inSingletonScope();
});
