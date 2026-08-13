import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast { id: string; message: string; kind: ToastKind }
interface ToastApi { show(message: string, kind?: ToastKind): void }
const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.kind}`} key={toast.id}>
            {toast.kind === "success" ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}
            <span>{toast.message}</span>
            <button aria-label="Fechar aviso" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}><X size={17} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast precisa estar dentro de ToastProvider.");
  return value;
}
