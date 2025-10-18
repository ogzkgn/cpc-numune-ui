import type { PropsWithChildren } from "react";
import { clsx } from "clsx";

export interface StepperStep {
  id: string;
  title: string;
  description?: string;
}

export interface StepperProps extends PropsWithChildren {
  steps: StepperStep[];
  activeStepId: string;
  onStepClick?: (stepId: string) => void;
}

const Stepper = ({ steps, activeStepId, onStepClick, children }: StepperProps) => {
  const activeIndex = steps.findIndex((step) => step.id === activeStepId);

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-4">
        {steps.map((step, index) => {
          const active = index === activeIndex;
          const completed = index < activeIndex;
          return (
            <li key={step.id} className="flex items-center gap-3">
              <button
                type="button"
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition",
                  completed && "border-brand-primary bg-brand-primary text-white",
                  active && !completed && "border-brand-primary text-brand-primary",
                  !active && !completed && "border-slate-300 text-slate-500 hover:border-brand-primary hover:text-brand-primary"
                )}
                onClick={() => onStepClick?.(step.id)}
                aria-current={active ? "step" : undefined}
              >
                {completed ? "✔" : index + 1}
              </button>
              <div className="flex flex-col text-left">
                <span className={clsx("text-sm font-semibold", active ? "text-slate-900" : "text-slate-600")}>{step.title}</span>
                {step.description ? <span className="text-xs text-slate-500">{step.description}</span> : null}
              </div>
            </li>
          );
        })}
      </ol>
      <div>{children}</div>
    </div>
  );
};

export default Stepper;