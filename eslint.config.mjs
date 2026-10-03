import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['**/lib/**', '**/node_modules/**', 'applications/**', 'packages/arch-client/src/generated/**'] },
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
        rules: {
            // node:test's test() returns a promise the runner itself awaits
            '@typescript-eslint/no-floating-promises': ['error', { allowForKnownSafeCalls: [{ from: 'package', package: 'node:test', name: ['test', 'describe', 'it', 'suite'] }] }],
            // backend RPC servers implement Promise-returning interfaces with sync bodies; async turns a throw into a rejection
            '@typescript-eslint/require-await': 'off',
            // sett-tokens' theme JSON is reachable only through its package exports, which tsc's `node` resolution can't see
            '@typescript-eslint/no-require-imports': ['error', { allow: ['^@tau-rs/sett-tokens/sett-theme\\.\\w+\\.json$'] }],
        },
    },
    {
        files: ['**/*.spec.ts'],
        // specs read JSON-RPC frames as untyped JSON on purpose: the assertions are the type check
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
        },
    },
);
