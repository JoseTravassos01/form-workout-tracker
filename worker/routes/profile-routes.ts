import { Hono } from "hono";
import { HttpError } from "../lib/http-error";
import { ProfileRepository } from "../repositories/profile-repository";
import type { AppEnvironment } from "../types";

export const profileRoutes = new Hono<AppEnvironment>()
  .get("/me", async (context) => {
    const me = await new ProfileRepository(context.env.DB).getMe(context.get("userId"));
    if (!me) throw new HttpError(404, "PROFILE_NOT_FOUND", "Perfil não encontrado.");
    return context.json(me);
  });
