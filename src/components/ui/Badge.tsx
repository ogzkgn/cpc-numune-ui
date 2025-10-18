import type { PropsWithChildren } from "react";
import { clsx } from "clsx";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-brand-primary/15 text-brand-primary",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  neutral: "bg-slate-100 text-slate-700"
};

export interface BadgeProps extends PropsWithChildren {
  variant?: BadgeVariant;
  className?: string;
}

const Badge = ({ variant = "default", className, children }: BadgeProps) => (
  <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", variantClasses[variant], className)}>
    {children}
  </span>
);

export default Badge;