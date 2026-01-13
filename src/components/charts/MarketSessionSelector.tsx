import { Button } from "@/components/ui/button";
import { Clock, Sun, Sunrise, Sunset } from "lucide-react";

export type MarketSession = 'all' | 'pre-market' | 'regular' | 'after-hours';

export interface SessionTimeRange {
  startHour: number;
  endHour: number;
  label: string;
}

export const SESSION_RANGES: Record<MarketSession, SessionTimeRange> = {
  'all': { startHour: 4, endHour: 20, label: '4 AM - 8 PM' },
  'pre-market': { startHour: 4, endHour: 6, label: '4 AM - 7 AM' },
  'regular': { startHour: 7, endHour: 16, label: '7 AM - 4 PM' },
  'after-hours': { startHour: 16, endHour: 20, label: '4 PM - 8 PM' },
};

interface MarketSessionSelectorProps {
  session: MarketSession;
  onSessionChange: (session: MarketSession) => void;
  className?: string;
}

export function MarketSessionSelector({ 
  session, 
  onSessionChange,
  className = ""
}: MarketSessionSelectorProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button
        variant={session === 'all' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onSessionChange('all')}
        className={`h-7 px-2 text-xs ${
          session === 'all' 
            ? 'bg-slate-600 hover:bg-slate-700 text-white' 
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="All Hours (4 AM - 8 PM)"
      >
        <Clock className="h-3 w-3 mr-1" />
        All
      </Button>
      <Button
        variant={session === 'regular' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onSessionChange('regular')}
        className={`h-7 px-2 text-xs ${
          session === 'regular' 
            ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Regular Hours (7 AM - 4 PM)"
      >
        <Sun className="h-3 w-3 mr-1" />
        Regular
      </Button>
      {/* Pre-market and After-hours buttons hidden for now */}
    </div>
  );
}
