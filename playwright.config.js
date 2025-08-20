const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'tests/e2e-results/html-report' }],
    ['junit', { outputFile: 'tests/e2e-results/junit.xml' }],
    ['json', { outputFile: 'tests/e2e-results/test-results.json' }],
    ['line']
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each action */
    actionTimeout: 10000,
    
    /* Global timeout for navigation */
    navigationTimeout: 30000,
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
      teardown: 'cleanup'
    },
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.js/
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use prepared auth state
        storageState: 'tests/e2e/.auth/user.json'
      },
      dependencies: ['setup']
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'tests/e2e/.auth/user.json'
      },
      dependencies: ['setup']
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'tests/e2e/.auth/user.json'
      },
      dependencies: ['setup']
    },
    
    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'tests/e2e/.auth/user.json'
      },
      dependencies: ['setup']
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'tests/e2e/.auth/user.json'
      },
      dependencies: ['setup']
    },
    
    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge',
        storageState: 'tests/e2e/.auth/user.json'
      },
      dependencies: ['setup']
    },
    {
      name: 'Google Chrome',
      use: { 
        ...devices['Desktop Chrome'], 
        channel: 'chrome',
        storageState: 'tests/e2e/.auth/user.json'
      },
      dependencies: ['setup']
    }
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.js'),

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'tests/e2e-results/',

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    },
    {
      command: 'cd api && php -S localhost:8000 -t public',
      port: 8000,
      reuseExistingServer: !process.env.CI,
      timeout: 60000
    }
  ],

  /* Test timeout */
  timeout: 60000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      mode: 'strict',
      threshold: 0.2
    },
    toMatchSnapshot: {
      threshold: 0.2
    }
  },

  /* Maximum time one test can run for. */
  testTimeout: 60000,

  /* Maximum time the whole test suite can run for. */
  globalTimeout: 600000
});
