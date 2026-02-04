import { cn } from "@/lib/utils";

interface SkipToContentProps {
  contentId?: string;
  className?: string;
}

export function SkipToContent({
  contentId = "main-content",
  className,
}: SkipToContentProps) {
  return (
    <a
      href={`#${contentId}`}
      className={cn(
        "sr-only focus:not-sr-only",
        "focus:fixed focus:top-4 focus:left-4 focus:z-50",
        "focus:px-4 focus:py-2",
        "focus:bg-primary focus:text-primary-foreground",
        "focus:rounded-md focus:shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
    >
      Skip to content
    </a>
  );
}
