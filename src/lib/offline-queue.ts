import { openDB, type DBSchema } from "idb";

interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  body: string | null;
  createdAt: string;
  attempts: number;
}

interface OfflineDatabase extends DBSchema {
  mutations: {
    key: string;
    value: QueuedMutation;
    indexes: { "by-created": string };
  };
}

const databasePromise = openDB<OfflineDatabase>("form-offline", 1, {
  upgrade(database) {
    const store = database.createObjectStore("mutations", { keyPath: "id" });
    store.createIndex("by-created", "createdAt");
  },
});

export async function queueMutation(mutation: Omit<QueuedMutation, "createdAt" | "attempts">): Promise<void> {
  const database = await databasePromise;
  await database.put("mutations", { ...mutation, createdAt: new Date().toISOString(), attempts: 0 });
  window.dispatchEvent(new CustomEvent("sync-state-change", { detail: { reason: "queued" } }));
}

export async function pendingMutationCount(): Promise<number> {
  return (await databasePromise).count("mutations");
}

export async function pendingMutationBodies(url: string): Promise<string[]> {
  const entries = await (await databasePromise).getAllFromIndex("mutations", "by-created");
  return entries.filter((entry) => entry.url === url && entry.body).map((entry) => entry.body!);
}

export async function flushMutationQueue(): Promise<{ synced: number; conflicts: number; remaining: number }> {
  const database = await databasePromise;
  const entries = await database.getAllFromIndex("mutations", "by-created");
  let synced = 0;
  let conflicts = 0;
  for (const entry of entries) {
    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: entry.body ? { "Content-Type": "application/json" } : undefined,
        body: entry.body,
        credentials: "same-origin",
      });
      if (response.ok) {
        await database.delete("mutations", entry.id);
        synced += 1;
      } else if (response.status === 409) {
        conflicts += 1;
        await database.put("mutations", { ...entry, attempts: entry.attempts + 1 });
      } else if (response.status >= 400 && response.status < 500) {
        await database.delete("mutations", entry.id);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  const remaining = await database.count("mutations");
  window.dispatchEvent(new CustomEvent("sync-state-change", { detail: { reason: "flushed", synced, conflicts, remaining } }));
  return { synced, conflicts, remaining };
}
