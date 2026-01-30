import { format } from 'date-fns';
import { MessageSquare, BarChart3, RefreshCw, Loader2, CheckCircle, XCircle, Clock, Brain, DollarSign } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DayCoverage } from '@/hooks/use-data-coverage';

interface DayDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string;
  date: Date;
  coverage: DayCoverage | null;
  onTriggerIngestion: (type: 'messages' | 'analytics' | 'psychology' | 'all') => void;
  isIngesting: boolean;
}

function IngestionStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  
  const variants: Record<string, { className: string; icon: React.ReactNode }> = {
    queued: { 
      className: 'bg-blue-500/10 text-blue-500 border-blue-500/20', 
      icon: <Clock className="h-3 w-3" /> 
    },
    running: { 
      className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', 
      icon: <Loader2 className="h-3 w-3 animate-spin" /> 
    },
    completed: { 
      className: 'bg-green-500/10 text-green-500 border-green-500/20', 
      icon: <CheckCircle className="h-3 w-3" /> 
    },
    failed: { 
      className: 'bg-red-500/10 text-red-500 border-red-500/20', 
      icon: <XCircle className="h-3 w-3" /> 
    },
  };
  
  const variant = variants[status] || { className: 'bg-muted text-muted-foreground', icon: null };
  
  return (
    <Badge variant="outline" className={cn('gap-1', variant.className)}>
      {variant.icon}
      {status}
    </Badge>
  );
}

interface StatusCardProps {
  icon: React.ReactNode;
  label: string;
  hasData: boolean;
  dataLabel?: string;
  pendingLabel?: string;
  hasPendingState?: boolean;
  isPending?: boolean;
}

function StatusCard({ icon, label, hasData, dataLabel, pendingLabel, hasPendingState, isPending }: StatusCardProps) {
  const showPending = hasPendingState && isPending && !hasData;
  
  return (
    <Card className={cn(
      "glass-card",
      hasData 
        ? "border-green-500/30 bg-green-500/5" 
        : showPending
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-muted"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {hasData ? (
          <div className="text-sm font-semibold text-green-500">
            {dataLabel || 'Available'}
          </div>
        ) : showPending ? (
          <div className="text-sm text-amber-500">{pendingLabel || 'Pending'}</div>
        ) : (
          <div className="text-sm text-muted-foreground">Missing</div>
        )}
      </CardContent>
    </Card>
  );
}

export function DayDetailSheet({
  open,
  onOpenChange,
  symbol,
  date,
  coverage,
  onTriggerIngestion,
  isIngesting,
}: DayDetailSheetProps) {
  const isFutureDate = date > new Date();
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="glass-card border-l border-white/10">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-bold">{symbol}</span>
            {coverage?.ingestionStatus && (
              <IngestionStatusBadge status={coverage.ingestionStatus} />
            )}
          </SheetTitle>
          <SheetDescription>{formattedDate}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Status Cards - 2x2 grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatusCard
              icon={<MessageSquare className="h-4 w-4" />}
              label="Messages"
              hasData={coverage?.hasMessages ?? false}
              dataLabel={coverage?.messageCount ? `${coverage.messageCount.toLocaleString()} msgs` : 'Available'}
            />

            <StatusCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Analytics"
              hasData={coverage?.hasAnalytics ?? false}
              dataLabel="Computed"
              pendingLabel="Pending"
              hasPendingState
              isPending={coverage?.hasMessages ?? false}
            />

            <StatusCard
              icon={<Brain className="h-4 w-4" />}
              label="Psychology"
              hasData={coverage?.hasPsychology ?? false}
              dataLabel="Snapshot"
              pendingLabel="Pending"
              hasPendingState
              isPending={coverage?.hasAnalytics ?? false}
            />

            <StatusCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Price"
              hasData={coverage?.hasPrice ?? false}
              dataLabel="Recorded"
            />
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Actions
            </p>
            
            <Button
              variant="outline"
              className="w-full justify-start glass-card"
              disabled={isFutureDate || isIngesting}
              onClick={() => onTriggerIngestion('messages')}
            >
              {isIngesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Fetch Messages
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start glass-card"
              disabled={isFutureDate || isIngesting || !coverage?.hasMessages}
              onClick={() => onTriggerIngestion('analytics')}
            >
              {isIngesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-2" />
              )}
              Generate Analytics
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start glass-card"
              disabled={isFutureDate || isIngesting || !coverage?.hasAnalytics}
              onClick={() => onTriggerIngestion('psychology')}
            >
              {isIngesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              Generate Psychology Snapshot
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start glass-card"
              disabled={isFutureDate || isIngesting}
              onClick={() => onTriggerIngestion('all')}
            >
              {isIngesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Re-fetch All Data
            </Button>

            {isFutureDate && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Cannot fetch data for future dates
              </p>
            )}
          </div>

          {/* Coverage Summary */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">
              Symbol Page Health
            </p>
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'Msgs', ok: coverage?.hasMessages },
                { label: 'Analytics', ok: coverage?.hasAnalytics },
                { label: 'Psychology', ok: coverage?.hasPsychology },
                { label: 'Price', ok: coverage?.hasPrice },
              ].map(({ label, ok }) => (
                <Badge 
                  key={label}
                  variant="outline" 
                  className={cn(
                    'text-xs',
                    ok 
                      ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {ok ? '✓' : '✗'} {label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
