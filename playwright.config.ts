import { defineConfig, devices } from '@playwright/test'

const MENU_OFF_PORT = 5006
const MENU_ON_PORT = 5007

function devServer(port: number, env: Record<string, string>) {
  return {
    command: `node node_modules/vite/bin/vite.js --host localhost --port ${port} --strictPort`,
    env: { VITE_USE_MOCK: 'true', ...env },
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  }
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'report',
      testIgnore: /menu\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${MENU_OFF_PORT}`,
        launchOptions: { args: ['--no-sandbox'] },
      },
    },
    {
      name: 'menu',
      testMatch: /menu\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${MENU_ON_PORT}`,
        launchOptions: { args: ['--no-sandbox'] },
      },
    },
  ],
  webServer: [
    devServer(MENU_OFF_PORT, {}),
    devServer(MENU_ON_PORT, {
      VITE_FEATURES: 'optimization.storage.report.overview,optimization.storage.report.onedrive',
    }),
  ],
})
