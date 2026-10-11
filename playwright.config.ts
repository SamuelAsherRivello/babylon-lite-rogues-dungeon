import { defineConfig, devices } from "@playwright/test";

const host = "127.0.0.1";
const port = 4173;
const basePath = "/babylon-lite-rogues-dungeon/";
const baseURL = `http://${host}:${port}${basePath}`;

export default defineConfig({
  testDir: "./rogues-dungeon/test/browser",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--enable-unsafe-webgpu", "--use-angle=swiftshader"] } } }],
  webServer: {
    command: `npm run dev -- --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
