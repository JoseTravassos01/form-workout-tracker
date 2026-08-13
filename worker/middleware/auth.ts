import { createMiddleware } from "hono/factory";
import { AuthService } from "../services/auth-service";
import type { AppEnvironment } from "../types";

export const requireAuth = createMiddleware<AppEnvironment>(async (context, next) => {
  const auth = await new AuthService(context).authenticate();
  context.set("sessionId", auth.sessionId);
  context.set("userId", auth.userId);
  context.set("athleteProfileId", auth.athleteProfileId);
  context.set("profileSex", auth.sex);
  await next();
});
