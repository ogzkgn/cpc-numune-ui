import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

import { useAppStore } from "../../state/useAppStore";

const variantClasses = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800"
};

const ToastContainer = () => {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);
  const timers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    toasts.forEach((toast) => {
      if (timers.current.has(toast.id)) return;
      const timeout = window.setTimeout(() => {
        removeToast(toast.id);
        timers.current.delete(toast.id);
      }, 4000);
      timers.current.set(toast.id, timeout);
    });

    return () => {
      timers.current.forEach((timeout) => window.clearTimeout(timeout));
      timers.current.clear();
    };
  }, [toasts, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-3 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            "pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg",
            variantClasses[toast.variant]
          )}
        >
          <div className="flex-1">
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.description ? <p className="text-xs text-slate-600">{toast.description}</p> : null}
          </div>
          <button
            type="button"
            className="rounded-full p-1 text-current hover:bg-white/40"
            onClick={() => removeToast(toast.id)}
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;