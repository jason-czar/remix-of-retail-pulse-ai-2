import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * A consistent empty state component used across the application.
 * Provides value-driven messaging with clear next actions.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6" : "py-12",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full bg-muted/50 flex items-center justify-center mb-4",
          compact ? "p-3" : "p-4"
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground/50",
            compact ? "h-8 w-8" : "h-10 w-10"
          )}
        />
      </div>
      <h3
        className={cn(
          "font-semibold text-foreground mb-1",
          compact ? "text-base" : "text-lg"
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "text-muted-foreground max-w-sm",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {description}
      </p>
      {action && <div className={cn("mt-4", compact && "mt-3")}>{action}</div>}
    </div>
  );
}
