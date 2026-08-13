import { createMiddleware } from "hono/factory";
import { HttpError } from "../lib/http-error";
import type { AppEnvironment } from "../types";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const enforceSameOrigin = createMiddleware<AppEnvironment>(async (context, next) => {
  if (!SAFE_METHODS.has(context.req.method)) {
    const origin = context.req.header("origin");
    const fetchSite = context.req.header("sec-fetch-site");
    const expected = new URL(context.req.url).origin;
    if ((origin && origin !== expected) || (fetchSite && fetchSite === "cross-site")) {
      throw new HttpError(403, "CROSS_SITE_REQUEST", "Requisição de origem não permitida.");
    }
  }
  await next();
});

export const securityHeaders = createMiddleware<AppEnvironment>(async (context, next) => {
  await next();
  context.header("X-Content-Type-Options", "nosniff");
  context.header("X-Frame-Options", "DENY");
  context.header("Referrer-Policy", "strict-origin-when-cross-origin");
  context.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  context.header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  if (String(context.env.APP_ENV) === "production") context.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
});
