import { useCallback, useEffect, useState } from "react";
import { apiGet } from "./api";

export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await apiGet<T>(path)); }
    catch (caught) { setError(caught instanceof Error ? caught : new Error("Erro desconhecido")); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh, setData };
}
