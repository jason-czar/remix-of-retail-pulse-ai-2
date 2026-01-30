import { useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Loader2, Zap } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useMonthCoverage, useRefreshCoverage, useTriggerIngestion, useBatchBackfill } from '@/hooks/use-data-coverage';
import { CoverageCalendar } from './CoverageCalendar';
import { DayDetailSheet } from './DayDetailSheet';
import type { DayCoverage, CoverageFilter } from '@/hooks/use-data-coverage';

export function DataCoverageTab() {
  const [symbol, setSymbol] = useState('NVDA');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState<CoverageFilter>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchTypes, setBatchTypes] = useState<('messages' | 'analytics' | 'psychology' | 'price')[]>(['messages', 'analytics']);

  const { data: coverage, isLoading, refetch } = useMonthCoverage(
    symbol,
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  );
  
  const refreshCoverage = useRefreshCoverage();
  const triggerIngestion = useTriggerIngestion();
  const batchBackfill = useBatchBackfill();

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

  const handleTriggerIngestion = (type: 'messages' | 'analytics' | 'psychology' | 'price' | 'all') => {
    if (selectedDate && symbol) {
      triggerIngestion.mutate({
        symbol,
        date: selectedDate.toISOString().split('T')[0],
        type,
      });
    }
  };

  const handleBatchBackfill = () => {
    if (symbol && coverage && batchTypes.length > 0) {
      batchBackfill.mutate({
        symbol,
        coverage,
        types: batchTypes,
      });
      setBatchDialogOpen(false);
    }
  };

  const toggleBatchType = (type: 'messages' | 'analytics' | 'psychology' | 'price') => {
    setBatchTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Count missing dates for the batch dialog
  const getMissingCounts = () => {
    if (!coverage) return { messages: 0, analytics: 0, psychology: 0, price: 0 };
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let messages = 0, analytics = 0, psychology = 0, price = 0;
    
    for (const day of coverage) {
      const dayDate = new Date(day.date + 'T12:00:00');
      if (dayDate > today) continue;
      const dayOfWeek = dayDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      if (!day.hasMessages) messages++;
      if (!day.hasAnalytics) analytics++;
      if (!day.hasPsychology) psychology++;
      if (!day.hasPrice) price++;
    }
    
    return { messages, analytics, psychology, price };
  };

  const missingCounts = getMissingCounts();

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
          <Select value={filter} onValueChange={(v) => setFilter(v as CoverageFilter)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="messages">Messages</SelectItem>
              <SelectItem value="analytics">Analytics</SelectItem>
              <SelectItem value="psychology">Psychology</SelectItem>
              <SelectItem value="price">Price</SelectItem>
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

          {/* Batch Backfill Button */}
          <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="sm"
                disabled={!symbol || isLoading}
              >
                <Zap className="h-4 w-4 mr-2" />
                Backfill All
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card">
              <DialogHeader>
                <DialogTitle>Batch Backfill Missing Data</DialogTitle>
                <DialogDescription>
                  Select which data types to backfill for all missing dates in {format(currentMonth, 'MMMM yyyy')}.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={batchTypes.includes('messages')}
                      onCheckedChange={() => toggleBatchType('messages')}
                    />
                    <span className="flex-1">Messages</span>
                    <span className="text-sm text-muted-foreground">
                      {missingCounts.messages} missing
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={batchTypes.includes('analytics')}
                      onCheckedChange={() => toggleBatchType('analytics')}
                    />
                    <span className="flex-1">Analytics</span>
                    <span className="text-sm text-muted-foreground">
                      {missingCounts.analytics} missing
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={batchTypes.includes('psychology')}
                      onCheckedChange={() => toggleBatchType('psychology')}
                    />
                    <span className="flex-1">Psychology Snapshots</span>
                    <span className="text-sm text-muted-foreground">
                      {missingCounts.psychology} missing
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={batchTypes.includes('price')}
                      onCheckedChange={() => toggleBatchType('price')}
                    />
                    <span className="flex-1">Price History</span>
                    <span className="text-sm text-muted-foreground">
                      {missingCounts.price} missing
                    </span>
                  </label>
                </div>

                {batchTypes.length === 0 && (
                  <p className="text-sm text-amber-500">
                    Select at least one data type to backfill.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleBatchBackfill}
                  disabled={batchTypes.length === 0 || batchBackfill.isPending}
                >
                  {batchBackfill.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Start Backfill
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
