import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { clsx } from "clsx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-brand-primary text-white hover:bg-brand-primary/90 focus:ring-brand-primary/30",
  secondary: "border border-brand-primary text-brand-primary hover:bg-brand-primary/10 focus:ring-brand-primary/20",
  ghost: "text-slate-700 hover:bg-slate-100 focus:ring-slate-200",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-200"
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-5 py-2.5"
};

export type ButtonProps = PropsWithChildren<
  {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: "left" | "right";
  } & ButtonHTMLAttributes<HTMLButtonElement>
>;

const Button = ({
  children,
  className,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  icon,
  iconPosition = "left",
  ...props
}: ButtonProps) => {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {icon && iconPosition === "left" ? <span className="flex h-4 w-4 items-center justify-center">{icon}</span> : null}
      {children}
      {icon && iconPosition === "right" ? <span className="flex h-4 w-4 items-center justify-center">{icon}</span> : null}
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" /> : null}
    </button>
  );
};

export default Button;