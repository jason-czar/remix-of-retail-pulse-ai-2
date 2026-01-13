import { Button } from "@/components/ui/button";
import { Sun, Sunrise, Sunset } from "lucide-react";

export type MarketSession = 'pre-market' | 'regular' | 'after-hours';

export interface SessionTimeRange {
  startHour: number;
  endHour: number;
  label: string;
}

export const SESSION_RANGES: Record<MarketSession, SessionTimeRange> = {
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
        variant={session === 'pre-market' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onSessionChange('pre-market')}
        className={`h-7 px-2 text-xs ${
          session === 'pre-market' 
            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Pre-Market (4 AM - 7 AM)"
      >
        <Sunrise className="h-3 w-3 mr-1" />
        Pre
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
      <Button
        variant={session === 'after-hours' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onSessionChange('after-hours')}
        className={`h-7 px-2 text-xs ${
          session === 'after-hours' 
            ? 'bg-amber-600 hover:bg-amber-700 text-white' 
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="After-Hours (4 PM - 8 PM)"
      >
        <Sunset className="h-3 w-3 mr-1" />
        After
      </Button>
    </div>
  );
}
