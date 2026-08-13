import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(path.resolve("migrations")),
          APP_ENV: "test",
          SESSION_TTL_DAYS: "14",
          SEED_SECRET: "integration-seed-secret-that-is-not-used-outside-tests",
          MALE_USERNAME: "teste-homem",
          MALE_PASSWORD: "male-test-password-long-and-unique",
          MALE_DISPLAY_NAME: "Atleta Teste A",
          MALE_PROGRAM_START_DATE: "2026-01-05",
          FEMALE_USERNAME: "teste-mulher",
          FEMALE_PASSWORD: "female-test-password-long-and-unique",
          FEMALE_DISPLAY_NAME: "Atleta Teste B",
          FEMALE_PROGRAM_START_DATE: "2026-01-05",
        },
      },
    })),
  ],
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/apply-migrations.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
