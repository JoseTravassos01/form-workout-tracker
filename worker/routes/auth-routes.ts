import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { AuthService } from "../services/auth-service";
import type { AppEnvironment } from "../types";
import { loginSchema } from "../validation/auth";

export const authRoutes = new Hono<AppEnvironment>()
  .post("/login", zValidator("json", loginSchema), async (context) => {
    const input = context.req.valid("json");
    await new AuthService(context).login(input.username, input.password);
    return context.json({ ok: true });
  })
  .post("/logout", requireAuth, async (context) => {
    await new AuthService(context).logout();
    return context.json({ ok: true });
  });
