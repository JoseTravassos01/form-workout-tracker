import { Hono } from "hono";
import { HttpError } from "./lib/http-error";
import { requireAuth } from "./middleware/auth";
import { enforceSameOrigin, securityHeaders } from "./middleware/security";
import { authRoutes } from "./routes/auth-routes";
import { calendarRoutes } from "./routes/calendar-routes";
import { cardioRoutes } from "./routes/cardio-routes";
import { dashboardRoutes } from "./routes/dashboard-routes";
import { exerciseRoutes, workoutRoutes } from "./routes/workout-routes";
import { profileRoutes } from "./routes/profile-routes";
import { measurementRoutes, progressRoutes } from "./routes/progress-routes";
import { programRoutes } from "./routes/program-routes";
import { recoveryRoutes } from "./routes/recovery-routes";
import { scienceRoutes } from "./routes/science-routes";
import { seedRoutes } from "./routes/seed-routes";
import { hydrationRoutes } from "./routes/hydration-routes";
import type { AppEnvironment } from "./types";

const app = new Hono<AppEnvironment>();

app.use("*", async (context, next) => {
  const requestId = crypto.randomUUID();
  context.set("requestId", requestId);
  context.header("X-Request-Id", requestId);
  const startedAt = Date.now();
  await next();
  console.log(JSON.stringify({ message: "request", requestId, method: context.req.method, path: new URL(context.req.url).pathname, status: context.res.status, durationMs: Date.now() - startedAt }));
});
app.use("*", securityHeaders);
app.use("/api/*", enforceSameOrigin);

app.get("/api/health", (context) => context.json({ ok: true }));
app.route("/api/auth", authRoutes);
app.route("/api/internal", seedRoutes);

const privateApi = new Hono<AppEnvironment>();
privateApi.use("*", requireAuth);
privateApi.route("/", profileRoutes);
privateApi.route("/dashboard", dashboardRoutes);
privateApi.route("/workouts", workoutRoutes);
privateApi.route("/exercises", exerciseRoutes);
privateApi.route("/calendar", calendarRoutes);
privateApi.route("/measurements", measurementRoutes);
privateApi.route("/progress", progressRoutes);
privateApi.route("/program", programRoutes);
privateApi.route("/recovery-checkins", recoveryRoutes);
privateApi.route("/science", scienceRoutes);
privateApi.route("/cardio", cardioRoutes);
privateApi.route("/hydration", hydrationRoutes);
app.route("/api", privateApi);

app.notFound((context) => context.json({ error: { code: "NOT_FOUND", message: "Rota não encontrada.", requestId: context.get("requestId") } }, 404));

app.onError((error, context) => {
  const requestId = context.get("requestId") || crypto.randomUUID();
  if (error instanceof HttpError) return context.json({ error: { code: error.code, message: error.message, requestId } }, error.status);
  console.error(JSON.stringify({ message: "unhandled_error", requestId, path: new URL(context.req.url).pathname, error: error instanceof Error ? error.message : "Unknown error" }));
  return context.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir a solicitação. Tente novamente.", requestId } }, 500);
});

export default app;
