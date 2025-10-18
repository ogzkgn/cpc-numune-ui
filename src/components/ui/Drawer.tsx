import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { PropsWithChildren, ReactNode } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

export interface DrawerProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  position?: "right" | "left";
  width?: "sm" | "md" | "lg";
  footer?: ReactNode;
}

const widthClasses: Record<NonNullable<DrawerProps["width"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl"
};

const Drawer = ({ open, onClose, title, description, position = "right", width = "md", footer, children }: DrawerProps) => {
  useEffect(() => {
    if (open) {
      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
      <aside
        className={clsx(
          "relative ml-auto flex h-full w-full flex-col border-slate-200 bg-white shadow-xl transition",
          position === "left" ? "ml-0" : "ml-auto",
          widthClasses[width]
        )}
      >
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="space-y-1">
            {typeof title === "string" ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : title}
            {description ? <p className="text-sm text-slate-600">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer ? <footer className="border-t border-slate-200 px-6 py-4">{footer}</footer> : null}
      </aside>
    </div>,
    document.body
  );
};

export default Drawer;