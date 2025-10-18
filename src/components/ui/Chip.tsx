import type { PropsWithChildren } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

export interface ChipProps extends PropsWithChildren {
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

const Chip = ({ children, onRemove, onClick, active, className }: ChipProps) => {
  return (
    <span
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        active ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-slate-200 bg-white text-slate-600",
        onClick && "cursor-pointer hover:border-brand-primary hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40",
        className
      )}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="rounded-full p-0.5 text-slate-400 hover:text-slate-700"
          aria-label="Kaldır"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
};

export default Chip;