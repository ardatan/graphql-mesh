import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src',
  testMatch: '**/*.e2e.ts',
  outputDir: './playwright/out',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright/report' }]],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-first-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'yarn dev',
    cwd: import.meta.dirname,
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
