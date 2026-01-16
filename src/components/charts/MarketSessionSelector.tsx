import { Clock, Sun } from "lucide-react";

export type MarketSession = 'all' | 'pre-market' | 'regular' | 'after-hours';

export interface SessionTimeRange {
  startHour: number;
  endHour: number;
  label: string;
}

export const SESSION_RANGES: Record<MarketSession, SessionTimeRange> = {
  'all': { startHour: 5, endHour: 18, label: '5 AM - 6 PM' },
  'pre-market': { startHour: 5, endHour: 6, label: '5 AM - 7 AM' },
  'regular': { startHour: 8, endHour: 14, label: '8 AM - 2 PM' },
  'after-hours': { startHour: 15, endHour: 18, label: '3 PM - 6 PM' },
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
    { key: 'all' as const, icon: Clock, label: 'All', title: 'All Hours (5 AM - 6 PM)' },
    { key: 'regular' as const, icon: Sun, label: 'Regular', title: 'Regular Hours (8 AM - 2 PM)' },
  ];

  return (
    <div className={`inline-flex h-8 items-center justify-center rounded-full p-1 text-muted-foreground bg-muted/60 backdrop-blur-xl border border-border/40 shadow-sm dark:glass-tabs-list ${className}`}>
      {sessions.map(({ key, icon: Icon, label, title }) => (
        <button
          key={key}
          onClick={() => onSessionChange(key)}
          title={title}
          className={`inline-flex items-center justify-center whitespace-nowrap px-2 py-1 text-xs font-medium rounded-full ring-offset-background transition-all duration-200 ${
            session === key
              ? 'bg-background text-foreground shadow-md dark:glass-tabs-trigger-active'
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
