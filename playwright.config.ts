import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 300_000,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4200', trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run start:server', port: 3000, reuseExistingServer: true, timeout: 120_000 },
    { command: 'npm start', url: 'http://localhost:4200', reuseExistingServer: true, timeout: 180_000 },
  ],
});
