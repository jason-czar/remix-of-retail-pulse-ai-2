import { useMemo } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth } from 'date-fns';
import { DayCoverageCell } from './DayCoverageCell';
import type { DayCoverage, CoverageFilter } from '@/hooks/use-data-coverage';

interface CoverageCalendarProps {
  year: number;
  month: number;
  coverage: DayCoverage[];
  filter: CoverageFilter;
  onDayClick: (date: Date) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CoverageCalendar({
  year,
  month,
  coverage,
  filter,
  onDayClick,
}: CoverageCalendarProps) {
  const { days, startPadding } = useMemo(() => {
    const start = startOfMonth(new Date(year, month));
    const end = endOfMonth(new Date(year, month));
    const days = eachDayOfInterval({ start, end });
    const startPadding = getDay(start); // 0-6, Sunday = 0
    return { days, startPadding };
  }, [year, month]);

  const coverageMap = useMemo(() => {
    const map = new Map<string, DayCoverage>();
    coverage.forEach(c => map.set(c.date, c));
    return map;
  }, [coverage]);

  return (
    <div className="w-full">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding for days before month starts */}
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}

        {/* Actual days */}
        {days.map(date => {
          const dateStr = date.toISOString().split('T')[0];
          const dayCoverage = coverageMap.get(dateStr) || null;
          
          return (
            <DayCoverageCell
              key={dateStr}
              date={date}
              coverage={dayCoverage}
              filter={filter}
              onClick={() => onDayClick(date)}
            />
          );
        })}
      </div>
    </div>
  );
}
