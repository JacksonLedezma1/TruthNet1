import { cn } from "@/lib/utils";
import { Check, X, Loader2 } from "lucide-react";

export type StepStatus = "completed" | "active" | "pending" | "failed";

export interface TimelineStep {
  label: string;
  description?: string;
  status: StepStatus;
}

interface ProgressTimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function ProgressTimeline({ steps, className }: ProgressTimelineProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {steps.map((step, i) => (
        <div key={i} className="flex gap-4">
          {/* Node + line */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-all",
                step.status === "completed" && "bg-accent/20 border-accent text-accent",
                step.status === "active" && "bg-primary/20 border-primary text-primary",
                step.status === "pending" && "border-muted-foreground/30 text-muted-foreground",
                step.status === "failed" && "bg-destructive/20 border-destructive text-destructive"
              )}
            >
              {step.status === "completed" && <Check className="w-4 h-4" />}
              {step.status === "active" && <Loader2 className="w-4 h-4 animate-spin" />}
              {step.status === "failed" && <X className="w-4 h-4" />}
              {step.status === "pending" && <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-0.5 h-12 transition-all",
                  step.status === "completed" ? "bg-accent/40" : "bg-border"
                )}
              />
            )}
          </div>

          {/* Content */}
          <div className="pt-1 pb-6">
            <p
              className={cn(
                "text-sm font-semibold tracking-wide uppercase",
                step.status === "completed" && "text-foreground",
                step.status === "active" && "text-primary",
                step.status === "pending" && "text-muted-foreground",
                step.status === "failed" && "text-destructive"
              )}
            >
              {step.label}
            </p>
            {step.description && (
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
