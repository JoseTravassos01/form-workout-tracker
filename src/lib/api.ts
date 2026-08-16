import type { ApiErrorPayload } from "../../shared/api";
import { queueMutation } from "./offline-queue";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let payload: ApiErrorPayload | null = null;
    try { payload = await response.json() as ApiErrorPayload; } catch { /* response without JSON */ }
    throw new ApiError(response.status, payload?.error.code ?? "REQUEST_FAILED", payload?.error.message ?? "Não foi possível concluir a solicitação.");
  }
  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return parseResponse<T>(await fetch(path, { credentials: "same-origin", signal }));
}

export async function apiMutation<T>(path: string, method: "POST" | "PATCH" | "DELETE", payload?: unknown, offline = false): Promise<T & { queued?: boolean }> {
  const body = payload === undefined ? null : JSON.stringify(payload);
  try {
    const response = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body, credentials: "same-origin" });
    return parseResponse<T & { queued?: boolean }>(response);
  } catch (error) {
    if (offline && (error instanceof TypeError || !navigator.onLine)) {
      await queueMutation({ id: crypto.randomUUID(), url: path, method, body });
      return { queued: true } as T & { queued: boolean };
    }
    throw error;
  }
}

export async function apiFormMutation<T>(path: string, form: FormData): Promise<T> {
  return parseResponse<T>(await fetch(path, { method: "POST", body: form, credentials: "same-origin" }));
}
