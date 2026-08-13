import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { MeDto } from "../../shared/api";
import { ApiError, apiGet, apiMutation } from "../lib/api";

interface AuthContextValue {
  me: MeDto | null;
  loading: boolean;
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [me, setMe] = useState<MeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { setMe(await apiGet<MeDto>("/api/me")); }
    catch (error) { if (error instanceof ApiError && error.status === 401) setMe(null); else throw error; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const login = useCallback(async (username: string, password: string) => {
    await apiMutation<{ ok: boolean }>("/api/auth/login", "POST", { username, password });
    await refresh();
  }, [refresh]);
  const logout = useCallback(async () => {
    await apiMutation("/api/auth/logout", "POST");
    setMe(null);
  }, []);
  const value = useMemo(() => ({ me, loading, login, logout, refresh }), [me, loading, login, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de AuthProvider.");
  return context;
}
