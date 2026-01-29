import { useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMonthCoverage, useRefreshCoverage, useTriggerIngestion } from '@/hooks/use-data-coverage';
import { CoverageCalendar } from './CoverageCalendar';
import { DayDetailSheet } from './DayDetailSheet';
import type { DayCoverage } from '@/hooks/use-data-coverage';

type FilterType = 'all' | 'messages' | 'analytics';

export function DataCoverageTab() {
  const [symbol, setSymbol] = useState('NVDA');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: coverage, isLoading, refetch } = useMonthCoverage(
    symbol,
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  );
  
  const refreshCoverage = useRefreshCoverage();
  const triggerIngestion = useTriggerIngestion();

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSymbol(e.target.value.toUpperCase());
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleRefresh = () => {
    if (symbol) {
      refreshCoverage.mutate({ symbol });
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setSheetOpen(true);
  };

  const handleTriggerIngestion = (type: 'messages' | 'analytics' | 'all') => {
    if (selectedDate && symbol) {
      triggerIngestion.mutate({
        symbol,
        date: selectedDate.toISOString().split('T')[0],
        type,
      });
    }
  };

  const selectedCoverage = selectedDate 
    ? coverage?.find(c => c.date === selectedDate.toISOString().split('T')[0]) || null
    : null;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Data Coverage</CardTitle>
        <CardDescription>
          Monitor data ingestion status and trigger backfills for missing dates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Symbol Input */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Symbol:</span>
            <Input
              value={symbol}
              onChange={handleSymbolChange}
              className="w-24 uppercase"
              placeholder="NVDA"
            />
          </div>

          {/* Filter Select */}
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="messages">Messages</SelectItem>
              <SelectItem value="analytics">Analytics</SelectItem>
            </SelectContent>
          </Select>

          {/* Month Navigation */}
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshCoverage.isPending || !symbol}
          >
            {refreshCoverage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <CoverageCalendar
            year={currentMonth.getFullYear()}
            month={currentMonth.getMonth()}
            coverage={coverage || []}
            filter={filter}
            onDayClick={handleDayClick}
          />
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span>Complete</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span>Partial</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2.5 w-2.5 rounded-full bg-muted" />
            <span>Missing</span>
          </div>
        </div>
      </CardContent>

      {/* Day Detail Sheet */}
      {selectedDate && (
        <DayDetailSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          symbol={symbol}
          date={selectedDate}
          coverage={selectedCoverage}
          onTriggerIngestion={handleTriggerIngestion}
          isIngesting={triggerIngestion.isPending}
        />
      )}
    </Card>
  );
}
