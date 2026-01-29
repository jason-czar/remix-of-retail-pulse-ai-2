import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './tooltip';

interface StaleDataIndicatorProps {
  isStale?: boolean;
  className?: string;
}

export function StaleDataIndicator({ isStale, className }: StaleDataIndicatorProps) {
  if (!isStale) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center text-xs text-muted-foreground gap-1", className)}>
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Updating...</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Data is being refreshed in the background</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
