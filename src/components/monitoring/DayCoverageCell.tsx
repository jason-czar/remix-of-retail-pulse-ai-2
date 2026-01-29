import { format, isAfter, startOfDay } from 'date-fns';
import { Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DayCoverage } from '@/hooks/use-data-coverage';

interface DayCoverageCellProps {
  date: Date;
  coverage: DayCoverage | null;
  filter: 'all' | 'messages' | 'analytics';
  onClick: () => void;
}

function getCoverageColor(
  coverage: DayCoverage | null,
  filter: 'all' | 'messages' | 'analytics'
): 'green' | 'amber' | 'gray' {
  if (!coverage) return 'gray';

  switch (filter) {
    case 'messages':
      return coverage.hasMessages ? 'green' : 'gray';
    case 'analytics':
      if (coverage.hasAnalytics) return 'green';
      if (coverage.hasMessages) return 'amber';
      return 'gray';
    case 'all':
    default:
      if (coverage.hasMessages && coverage.hasAnalytics) return 'green';
      if (coverage.hasMessages || coverage.hasAnalytics) return 'amber';
      return 'gray';
  }
}

export function DayCoverageCell({ date, coverage, filter, onClick }: DayCoverageCellProps) {
  const today = startOfDay(new Date());
  const isFuture = isAfter(date, today);
  const isRunning = coverage?.ingestionStatus === 'running';
  const color = getCoverageColor(coverage, filter);

  const dotColorClass = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    gray: 'bg-muted',
  }[color];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            disabled={isFuture}
            className={cn(
              'aspect-square flex flex-col items-center justify-center rounded-lg transition-colors relative',
              'hover:bg-accent/50',
              isFuture && 'opacity-40 cursor-not-allowed hover:bg-transparent',
              !isFuture && 'cursor-pointer'
            )}
          >
            <span className={cn(
              'text-sm font-medium',
              isFuture && 'text-muted-foreground'
            )}>
              {format(date, 'd')}
            </span>
            
            {/* Status dot */}
            <div className={cn(
              'h-1.5 w-1.5 rounded-full mt-1',
              dotColorClass
            )} />

            {/* Loading overlay */}
            {isRunning && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-1">
            <p className="font-medium">{format(date, 'MMM d, yyyy')}</p>
            {isFuture ? (
              <p className="text-muted-foreground">Future date</p>
            ) : (
              <>
                <p>
                  Messages: {coverage?.hasMessages ? `${coverage.messageCount} msgs` : 'None'}
                </p>
                <p>
                  Analytics: {coverage?.hasAnalytics ? 'Computed' : 'Missing'}
                </p>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
