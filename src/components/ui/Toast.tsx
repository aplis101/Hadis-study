"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import type { ToastType } from "@/types/shared";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const toastConfig: Record<ToastType, { icon: React.ReactNode; bg: string; border: string }> = {
  success: {
    icon: <CheckCircle className="size-5 text-green-600" />,
    bg: "bg-green-50",
    border: "border-green-200",
  },
  error: {
    icon: <AlertCircle className="size-5 text-red-600" />,
    bg: "bg-red-50",
    border: "border-red-200",
  },
  info: {
    icon: <Info className="size-5 text-sky-600" />,
    bg: "bg-sky-50",
    border: "border-sky-200",
  },
  warning: {
    icon: <AlertTriangle className="size-5 text-amber-600" />,
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
};

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void;
  showToast: (message: string, type?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const showToast = useCallback((message: string, type?: string) => {
    const normalizedType = (type === "success" || type === "error" || type === "info" || type === "warning")
      ? type as ToastType
      : type === "error" ? "error" : "success";
    addToast(normalizedType, message);
  }, [addToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, showToast }}>
      {children}
      <div className="fixed bottom-20 md:bottom-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
  const config = toastConfig[toast.type];

  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${config.bg} ${config.border} max-w-sm w-full animate-slide-up`}
      role="alert"
    >
      {config.icon}
      <p className="flex-1 text-sm text-stone-800">{toast.message}</p>
      <button
        onClick={onClose}
        className="p-0.5 rounded hover:bg-stone-200/50"
        aria-label="إغلاق التنبيه"
      >
        <X className="size-4 text-stone-400" />
      </button>
    </div>
  );
}
