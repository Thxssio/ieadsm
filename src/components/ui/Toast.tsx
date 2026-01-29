"use client";

import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
};

type ToastInput = Omit<Toast, "id"> & {
  id?: string;
  durationMs?: number;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<
  ToastType,
  { container: string; icon: string; description: string }
> = {
  success: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: "text-emerald-600",
    description: "text-emerald-700",
  },
  error: {
    container: "border-red-200 bg-red-50 text-red-900",
    icon: "text-red-600",
    description: "text-red-700",
  },
  info: {
    container: "border-slate-200 bg-white text-slate-900",
    icon: "text-slate-500",
    description: "text-slate-500",
  },
};

const iconMap: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

type ToastViewportProps = {
  toasts: Toast[];
  onClose: (id: string) => void;
};

function ToastViewport({ toasts, onClose }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-[360px] z-[70] flex flex-col gap-3">
      {toasts.map((toast) => {
        const styles = toastStyles[toast.type];
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={`rounded-2xl border p-4 shadow-lg animate-fade-in ${styles.container}`}
            role={toast.type === "error" ? "alert" : "status"}
          >
            <div className="flex gap-3 items-start">
              <span className={`${styles.icon} mt-0.5`}>
                <Icon size={18} />
              </span>
              <div className="flex-1">
                <p className="font-semibold">{toast.title}</p>
                {toast.description ? (
                  <p className={`text-sm mt-1 ${styles.description}`}>
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onClose(toast.id)}
                className="rounded-full p-1.5 text-current/60 hover:text-current hover:bg-black/5 transition"
                aria-label="Fechar aviso"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    ({ id, durationMs = 3500, ...toast }: ToastInput) => {
      const toastId = id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { ...toast, id: toastId }]);
      if (durationMs > 0) {
        const timer = setTimeout(() => removeToast(toastId), durationMs);
        timers.current.set(toastId, timer);
      }
    },
    [removeToast]
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
