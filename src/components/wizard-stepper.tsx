import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type WizardStep =
  | "topic"
  | "research"
  | "plan"
  | "copy"
  | "design";

const STEPS: Array<{ key: WizardStep; label: string; index: number }> = [
  { key: "topic", label: "토픽", index: 1 },
  { key: "research", label: "리서치", index: 2 },
  { key: "plan", label: "기획", index: 3 },
  { key: "copy", label: "카피", index: 4 },
  { key: "design", label: "디자인", index: 5 },
];

export function WizardStepper({
  current,
  projectId,
}: {
  current: WizardStep;
  projectId?: string;
}) {
  const currentIndex =
    STEPS.find((s) => s.key === current)?.index ?? 1;

  return (
    <ol className="mx-auto flex max-w-3xl items-center gap-2">
      {STEPS.map((step, i) => {
        const isCurrent = step.key === current;
        const isPast = step.index < currentIndex;
        const isClickable =
          isPast && !!projectId && step.key !== "topic";

        const href =
          step.key === "topic"
            ? "/new/topic"
            : projectId
              ? `/new/${step.key}/${projectId}`
              : null;

        const content = (
          <div
            className={cn(
              "flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              isCurrent && "bg-bg-elevated text-text-primary",
              !isCurrent && isPast && "text-text-secondary",
              !isCurrent && !isPast && "text-text-muted"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                isCurrent && "bg-accent text-white",
                !isCurrent && isPast && "bg-emerald-500/15 text-emerald-400",
                !isCurrent && !isPast && "bg-border text-text-muted"
              )}
            >
              {isPast ? <Check className="h-3 w-3" /> : step.index}
            </span>
            <span className="hidden font-medium sm:inline">{step.label}</span>
          </div>
        );

        return (
          <li key={step.key} className="flex flex-1 items-center">
            {isClickable && href ? (
              <Link href={href} className="flex-1">
                {content}
              </Link>
            ) : (
              content
            )}
            {i < STEPS.length - 1 && (
              <div className="mx-1 h-px w-3 bg-border sm:w-6" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
