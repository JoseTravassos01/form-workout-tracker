import { Hono } from "hono";
import { secureStringEqual } from "../lib/crypto";
import { HttpError } from "../lib/http-error";
import { SeedService } from "../services/seed-service";
import type { AppEnvironment } from "../types";

export const seedRoutes = new Hono<AppEnvironment>()
  .post("/seed", async (context) => {
    const configured = context.env.SEED_SECRET;
    const supplied = context.req.header("x-seed-secret");
    if (!configured || !supplied || !(await secureStringEqual(supplied, configured))) throw new HttpError(404, "NOT_FOUND", "Rota não encontrada.");
    const result = await new SeedService(context.env).run();
    return context.json(result);
  });
