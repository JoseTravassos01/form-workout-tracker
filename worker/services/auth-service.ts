import { getConnInfo } from "hono/cloudflare-workers";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { randomToken, sha256, verifyPassword } from "../lib/crypto";
import { HttpError } from "../lib/http-error";
import { AuthRepository } from "../repositories/auth-repository";
import type { AppEnvironment } from "../types";

export const SESSION_COOKIE = "__Host-gym_session";
const FALLBACK_COOKIE = "gym_session";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000;
// A valid PBKDF2 record keeps unknown-user logins on the same expensive path as
// known users, reducing username-enumeration signal without storing a password.
const DUMMY_PASSWORD_HASH = "pbkdf2_sha256$100000$cEhL7pCjtsP0Zv8X6O02Vg$nC4Nt2u5HaXnePrVJpHfb0N71BLuQswxURdvgFmIyaE=";

export class AuthService {
  private readonly repository: AuthRepository;

  constructor(private readonly context: Context<AppEnvironment>) {
    this.repository = new AuthRepository(context.env.DB);
  }

  private isProduction(): boolean {
    return String(this.context.env.APP_ENV) === "production";
  }

  private sessionCookieName(): string {
    return this.isProduction() ? SESSION_COOKIE : FALLBACK_COOKIE;
  }

  private async loginKey(username: string): Promise<string> {
    const address = getConnInfo(this.context).remote.address ?? "unknown";
    return sha256(`${username}|${address}`);
  }

  async login(usernameRaw: string, password: string): Promise<void> {
    const username = usernameRaw.trim().toLocaleLowerCase("pt-BR");
    const keyHash = await this.loginKey(username);
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const attempt = await this.repository.getLoginAttempt(keyHash);
    if (attempt?.blocked_until && Date.parse(attempt.blocked_until) > nowDate.getTime()) {
      throw new HttpError(429, "LOGIN_RATE_LIMITED", "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    }

    const user = await this.repository.findUserByUsername(username);
    const passwordValid = await verifyPassword(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
    const valid = user?.active === 1 && passwordValid;
    if (!valid || !user) {
      const windowExpired = !attempt || nowDate.getTime() - Date.parse(attempt.window_started_at) > WINDOW_MS;
      const nextAttempts = windowExpired ? 1 : (attempt.attempts + 1);
      const blockedUntil = nextAttempts >= MAX_ATTEMPTS ? new Date(nowDate.getTime() + BLOCK_MS).toISOString() : null;
      await this.repository.recordFailedLogin(keyHash, now, blockedUntil, windowExpired);
      throw new HttpError(401, "INVALID_CREDENTIALS", "Usuário ou senha inválidos.");
    }

    await this.repository.clearLoginAttempts(keyHash);
    const token = randomToken();
    const tokenHash = await sha256(token);
    const ttlDays = Math.min(30, Math.max(1, Number(this.context.env.SESSION_TTL_DAYS) || 14));
    const expiresAt = new Date(nowDate.getTime() + ttlDays * 86_400_000).toISOString();
    const userAgent = this.context.req.header("user-agent");
    await this.repository.createSession({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt,
      now,
      userAgentHash: userAgent ? await sha256(userAgent) : null,
    });
    setCookie(this.context, this.sessionCookieName(), token, {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: "Strict",
      path: "/",
      maxAge: ttlDays * 86_400,
    });
  }

  async authenticate(): Promise<{ sessionId: string; userId: string; athleteProfileId: string; sex: "male" | "female" }> {
    const token = getCookie(this.context, this.sessionCookieName());
    if (!token) throw new HttpError(401, "UNAUTHENTICATED", "Faça login para continuar.");
    const now = new Date().toISOString();
    const session = await this.repository.validateSession(await sha256(token), now);
    if (!session) {
      deleteCookie(this.context, this.sessionCookieName(), { path: "/", secure: this.isProduction() });
      throw new HttpError(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente.");
    }
    const lastUsedUpdate = this.repository.touchSession(session.session_id, now);
    this.context.executionCtx.waitUntil(lastUsedUpdate);
    return { sessionId: session.session_id, userId: session.user_id, athleteProfileId: session.athlete_profile_id, sex: session.sex };
  }

  async logout(): Promise<void> {
    const token = getCookie(this.context, this.sessionCookieName());
    if (token) {
      const session = await this.repository.validateSession(await sha256(token), new Date(0).toISOString());
      if (session) await this.repository.deleteSession(session.session_id);
    }
    deleteCookie(this.context, this.sessionCookieName(), { path: "/", secure: this.isProduction() });
  }
}
