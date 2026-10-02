import { defineConfig } from '@playwright/test';

// Smoke tests on the composed shell, browser target. The app is built first (npm run build:browser).
export default defineConfig({
    testDir: 'e2e',
    timeout: 60_000,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
    webServer: {
        command: 'npx theia start --port 3000 --hostname 127.0.0.1 --root-dir=../..',  // the repo itself is the opened workspace
        cwd: 'applications/browser',
        url: 'http://127.0.0.1:3000',
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
    },
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
