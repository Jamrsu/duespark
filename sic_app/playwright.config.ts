import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: 'e2e/auth.setup.ts',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: undefined, // Don't use storage state for setup
      },
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'e2e/auth.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'e2e/auth.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'e2e/auth.json',
      },
      dependencies: ['setup'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})