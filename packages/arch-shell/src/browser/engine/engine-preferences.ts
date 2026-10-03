import { PreferenceSchema } from '@theia/core/lib/common/preferences/preference-schema';

export const ENGINE_PATH_PREFERENCE = 'arch.engine.path';

/** choice 5, discovery step 1: a developer pointing the app at a local engine build */
export const enginePreferenceSchema: PreferenceSchema = {
    properties: {
        [ENGINE_PATH_PREFERENCE]: {
            type: 'string',
            description: 'Path to the arch engine binary. Empty: look at ARCH_BIN, then PATH, then the bundled binary.',
            default: '',
        },
    },
};
