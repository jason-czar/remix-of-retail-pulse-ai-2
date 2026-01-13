import { format, subDays, isWeekend, eachDayOfInterval, startOfDay, isBefore, isToday } from "date-fns";

export interface GapPlaceholder {
  date: string;
  sortKey: string;
  isGap: true;
  totalMessages: 0;
  volumePercent: 0;
}

/**
 * Generate all expected weekday dates in a range
 */
export function getExpectedWeekdays(days: number): string[] {
  const today = startOfDay(new Date());
  const startDate = subDays(today, days);
  
  const allDays = eachDayOfInterval({ start: startDate, end: today });
  
  return allDays
    .filter(date => !isWeekend(date) && (isBefore(date, today) || isToday(date)))
    .map(date => format(date, 'yyyy-MM-dd'));
}

/**
 * Detect missing weekday dates from existing data
 */
export function detectMissingDates(
  existingDates: string[], 
  days: number
): string[] {
  const expectedDates = getExpectedWeekdays(days);
  const existingSet = new Set(existingDates);
  
  // Don't include today as a gap (data may not be recorded yet)
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  return expectedDates.filter(date => 
    !existingSet.has(date) && date !== todayStr
  );
}

/**
 * Create gap placeholder entries for chart data
 */
export function createGapPlaceholders(missingDates: string[]): GapPlaceholder[] {
  return missingDates.map(sortKey => ({
    date: format(new Date(sortKey), 'MMM d'),
    sortKey,
    isGap: true as const,
    totalMessages: 0,
    volumePercent: 0,
  }));
}

/**
 * Merge actual data with gap placeholders, sorted by date
 */
export function mergeDataWithGaps<T extends { sortKey: string }>(
  actualData: T[],
  gaps: GapPlaceholder[]
): (T | GapPlaceholder)[] {
  const combined = [...actualData, ...gaps];
  return combined.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

/**
 * Check if a data point is a gap placeholder
 */
export function isGapPlaceholder(item: any): item is GapPlaceholder {
  return item?.isGap === true;
}
