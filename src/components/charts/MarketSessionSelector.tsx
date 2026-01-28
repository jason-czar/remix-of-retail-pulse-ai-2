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
    <div className={`inline-flex h-8 items-center justify-center rounded-full p-1 text-muted-foreground bg-white/50 dark:bg-white/[0.06] backdrop-blur-[12px] backdrop-saturate-[140%] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_6px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_6px_rgba(0,0,0,0.15)] ${className}`}>
      {sessions.map(({ key, icon: Icon, label, title }) => (
        <button
          key={key}
          onClick={() => onSessionChange(key)}
          title={title}
          className={`inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 text-xs font-medium rounded-full ring-offset-background transition-all duration-200 ${
            session === key
              ? 'bg-white dark:bg-white/[0.12] text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.1)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
              : 'text-muted-foreground hover:text-foreground/80 hover:bg-white/30 dark:hover:bg-white/[0.06]'
          }`}
        >
          <Icon className="h-3 w-3 mr-1" />
          {label}
        </button>
      ))}
    </div>
  );
}
