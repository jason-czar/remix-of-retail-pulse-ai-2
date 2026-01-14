import { Clock, Sun } from "lucide-react";

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
  const sessions = [
    { key: 'all' as const, icon: Clock, label: 'All', title: 'All Hours (4 AM - 8 PM)' },
    { key: 'regular' as const, icon: Sun, label: 'Regular', title: 'Regular Hours (7 AM - 4 PM)' },
  ];

  return (
    <div className={`inline-flex h-8 items-center justify-center rounded-full p-1 text-muted-foreground bg-muted/60 dark:bg-[linear-gradient(135deg,hsl(240_15%_25%/0.35)_0%,hsl(240_15%_18%/0.2)_100%)] backdrop-blur-xl border border-border/40 dark:border-white/15 shadow-sm dark:shadow-[0_8px_32px_hsl(240_15%_0%/0.4),inset_0_1px_0_hsl(0_0%_100%/0.1)] ${className}`}>
      {sessions.map(({ key, icon: Icon, label, title }) => (
        <button
          key={key}
          onClick={() => onSessionChange(key)}
          title={title}
          className={`inline-flex items-center justify-center whitespace-nowrap px-2 py-1 text-xs font-medium rounded-full ring-offset-background transition-all duration-200 ${
            session === key
              ? 'bg-background text-foreground shadow-md dark:shadow-[0_4px_16px_hsl(240_15%_0%/0.5),inset_0_1px_0_hsl(0_0%_100%/0.15)] dark:bg-[linear-gradient(180deg,hsl(0_0%_100%/0.12)_0%,hsl(0_0%_100%/0.06)_100%)] dark:border dark:border-white/12 dark:backdrop-blur-md'
              : 'text-muted-foreground hover:text-foreground/80 hover:bg-white/5'
          }`}
        >
          <Icon className="h-3 w-3 mr-1" />
          {label}
        </button>
      ))}
    </div>
  );
}
