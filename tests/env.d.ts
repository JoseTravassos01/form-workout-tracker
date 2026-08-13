import type { D1Migration } from "cloudflare:test";

declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
      SEED_SECRET: string;
      MALE_USERNAME: string;
      MALE_PASSWORD: string;
      MALE_DISPLAY_NAME: string;
      MALE_PROGRAM_START_DATE: string;
      FEMALE_USERNAME: string;
      FEMALE_PASSWORD: string;
      FEMALE_DISPLAY_NAME: string;
      FEMALE_PROGRAM_START_DATE: string;
    }

    interface GlobalProps {
      mainModule: typeof import("../worker/index");
    }
  }
}

export {};
