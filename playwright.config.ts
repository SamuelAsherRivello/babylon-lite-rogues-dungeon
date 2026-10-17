import { defineConfig, devices } from "@playwright/test";

const host = "127.0.0.1";
const port = 6500;
const basePath = "/babylon-lite-rogues-dungeon/";
const baseURL = `http://${host}:${port}${basePath}`;

export default defineConfig({
  testDir: "./rogues-dungeon/test/browser",
  outputDir: "output/playwright/",
  // Babylon Lite requires a real WebGPU device. Serial browser coverage avoids
  // competing device initialization across parallel Edge workers.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "edge", use: { ...devices["Desktop Edge"], headless: false, launchOptions: { channel: "msedge" } } }],
  webServer: {
    command: `npm run dev -- --host ${host} --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
