import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
// import.meta.dirname (Node 21.2+), not __dirname — this repo's package.json
// sets "type": "module", so config/test files load as ESM.

// A dedicated, throwaway SQLite file — never the one `npm run dev` uses —
// so running the suite can't clobber real local dev data, and each run
// starts from a clean, predictable DB. tests/e2e/global-setup.ts deletes
// any file left over from a previous run before migrations apply.
const TEST_DB = path.resolve(import.meta.dirname, "data/e2e-test.db");
const PORT = 3100;
const BASE_DOMAIN = `localhost:${PORT}`;

const serverEnv = {
  DATABASE_URL: TEST_DB,
  PORT: String(PORT),
  BASE_DOMAIN,
  API_BASE_URL: `http://api.${BASE_DOMAIN}`,
  STORAGE_DRIVER: "local",
  LOCAL_STORAGE_DIR: path.resolve(import.meta.dirname, "data/e2e-test-uploads"),
  NODE_ENV: "development",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: `http://${BASE_DOMAIN}`,
    trace: "retain-on-failure",
  },
  // WebKit specifically, not Chromium — the bug class this suite exists to
  // catch (server/src/render/themes/cards.tsx's scroll-lock/restore around
  // opening and closing a card) is a WebKit-specific quirk, verified
  // against real WebKit (iOS Simulator) when originally fixed. Playwright's
  // WebKit is a desktop build, so it won't reproduce real touch/momentum
  // scroll physics — see the test file for how it still exercises the same
  // code path deterministically without relying on that.
  projects: [{ name: "webkit", use: { ...devices["Desktop Safari"] } }],
  webServer: {
    // `env` below hands DATABASE_URL etc. to every step here, so this only
    // needs to sequence the steps themselves: wipe any DB left over from a
    // previous run (a stale file would make bootstrap-owner in the test's
    // own setup a silent no-op instead of minting a fresh owner), migrate
    // it fresh, then start the server proper.
    command: `sh -c 'rm -f "${TEST_DB}"* && npm run db:migrate && npm run dev'`,
    url: `http://${BASE_DOMAIN}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: serverEnv,
  },
});
