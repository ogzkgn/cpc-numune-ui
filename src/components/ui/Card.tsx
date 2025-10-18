import type { PropsWithChildren, ReactNode } from "react";
import { clsx } from "clsx";

export interface CardProps extends PropsWithChildren {
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

const Card = ({ className, header, footer, children }: CardProps) => {
  return (
    <section className={clsx("flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      {header ? <div className="border-b border-slate-200 px-5 py-4 text-sm font-medium text-slate-700">{header}</div> : null}
      <div className="flex-1 px-5 py-4">{children}</div>
      {footer ? <div className="border-t border-slate-200 px-5 py-3">{footer}</div> : null}
    </section>
  );
};

export default Card;