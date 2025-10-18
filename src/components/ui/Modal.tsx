import { Fragment, useEffect } from "react";
import { createPortal } from "react-dom";
import type { PropsWithChildren, ReactNode } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

export interface ModalProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
  className?: string;
}

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl"
};

const Modal = ({ open, onClose, title, description, size = "md", footer, className, children }: ModalProps) => {
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
    <Fragment>
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-8">
        <div
          className={clsx(
            "relative w-full transform rounded-3xl border border-slate-200 bg-white shadow-xl transition",
            sizeClasses[size],
            className
          )}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
          {(title || description) && (
            <header className="space-y-1 px-6 pt-6 pb-4">
              {typeof title === "string" ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : title}
              {description ? <p className="text-sm text-slate-600">{description}</p> : null}
            </header>
          )}
          <div className="px-6 py-4">{children}</div>
          {footer ? <footer className="flex justify-end gap-2 px-6 pb-6">{footer}</footer> : null}
        </div>
      </div>
    </Fragment>,
    document.body
  );
};

export default Modal;