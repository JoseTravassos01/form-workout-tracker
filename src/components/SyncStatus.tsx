import { CloudOff, CloudUpload, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { flushMutationQueue, pendingMutationCount } from "../lib/offline-queue";
import { useToast } from "../app/ToastProvider";

export function SyncStatus() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const { show } = useToast();
  const refresh = useCallback(async () => setPending(await pendingMutationCount()), []);
  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    const result = await flushMutationQueue();
    setPending(result.remaining);
    setSyncing(false);
    if (result.synced > 0) show(`${result.synced} registro(s) sincronizado(s).`, "success");
    if (result.conflicts > 0) show("Há um conflito para revisar antes de sincronizar.", "error");
  }, [show]);
  useEffect(() => {
    void refresh();
    const update = () => void refresh();
    const online = () => void sync();
    window.addEventListener("sync-state-change", update);
    window.addEventListener("online", online);
    return () => { window.removeEventListener("sync-state-change", update); window.removeEventListener("online", online); };
  }, [refresh, sync]);
  if (pending === 0) return <span className="sync-status synced"><CloudUpload size={14} /> Sincronizado</span>;
  return <button className="sync-status pending" onClick={() => void sync()} disabled={syncing}><CloudOff size={14} /> {pending} não sincronizado{pending > 1 ? "s" : ""} {syncing && <RefreshCw className="spin" size={13} />}</button>;
}
