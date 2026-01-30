import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Loader2, Zap, CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { 
  useMonthCoverage, 
  useRefreshCoverage, 
  useTriggerIngestion, 
  useBatchBackfill,
  setBatchBackfillProgressCallback,
  type BatchBackfillProgress 
} from '@/hooks/use-data-coverage';
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
  
  // Date range for batch backfill - defaults to current month
  const [batchStartDate, setBatchStartDate] = useState<Date>(() => startOfMonth(new Date()));
  const [batchEndDate, setBatchEndDate] = useState<Date>(() => endOfMonth(new Date()));
  
  // Progress tracking
  const [batchProgress, setBatchProgress] = useState<BatchBackfillProgress | null>(null);

  const { data: coverage, isLoading, refetch } = useMonthCoverage(
    symbol,
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  );
  
  const refreshCoverage = useRefreshCoverage();
  const triggerIngestion = useTriggerIngestion();
  const batchBackfill = useBatchBackfill();
  
  // Set up progress callback
  useEffect(() => {
    if (batchBackfill.isPending) {
      setBatchBackfillProgressCallback(setBatchProgress);
    } else {
      setBatchBackfillProgressCallback(null);
      // Clear progress after a delay when done
      if (batchProgress) {
        const timer = setTimeout(() => setBatchProgress(null), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [batchBackfill.isPending]);

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
    if (symbol && batchTypes.length > 0 && batchStartDate && batchEndDate) {
      batchBackfill.mutate({
        symbol,
        startDate: batchStartDate.toISOString().split('T')[0],
        endDate: batchEndDate.toISOString().split('T')[0],
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

  // Count trading days in the selected range
  const tradingDaysInRange = useMemo(() => {
    if (!batchStartDate || !batchEndDate) return 0;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const days = eachDayOfInterval({ start: batchStartDate, end: batchEndDate });
    return days.filter(d => !isWeekend(d) && d <= today).length;
  }, [batchStartDate, batchEndDate]);

  // Reset date range to current month when dialog opens
  const handleOpenBatchDialog = (open: boolean) => {
    if (open) {
      setBatchStartDate(startOfMonth(currentMonth));
      setBatchEndDate(endOfMonth(currentMonth));
    }
    setBatchDialogOpen(open);
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
          <Dialog open={batchDialogOpen} onOpenChange={handleOpenBatchDialog}>
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
            <DialogContent className="glass-card max-w-md">
              <DialogHeader>
                <DialogTitle>Batch Backfill Missing Data</DialogTitle>
                <DialogDescription>
                  Select a date range and data types to backfill for {symbol}.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-5 py-4">
                {/* Date Range Pickers */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Date Range</label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !batchStartDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {batchStartDate ? format(batchStartDate, "MMM d, yyyy") : "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={batchStartDate}
                          onSelect={(date) => date && setBatchStartDate(date)}
                          disabled={(date) => date > new Date() || (batchEndDate && date > batchEndDate)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-muted-foreground">to</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !batchEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {batchEndDate ? format(batchEndDate, "MMM d, yyyy") : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={batchEndDate}
                          onSelect={(date) => date && setBatchEndDate(date)}
                          disabled={(date) => date > new Date() || (batchStartDate && date < batchStartDate)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tradingDaysInRange} trading days in selected range
                  </p>
                </div>

                {/* Data Type Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Data Types</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={batchTypes.includes('messages')}
                        onCheckedChange={() => toggleBatchType('messages')}
                      />
                      <span className="flex-1">Messages</span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={batchTypes.includes('analytics')}
                        onCheckedChange={() => toggleBatchType('analytics')}
                      />
                      <span className="flex-1">Analytics</span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={batchTypes.includes('psychology')}
                        onCheckedChange={() => toggleBatchType('psychology')}
                      />
                      <span className="flex-1">Psychology Snapshots</span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={batchTypes.includes('price')}
                        onCheckedChange={() => toggleBatchType('price')}
                      />
                      <span className="flex-1">Price History</span>
                    </label>
                  </div>
                </div>

                {batchTypes.length === 0 && (
                  <p className="text-sm text-amber-500">
                    Select at least one data type to backfill.
                  </p>
                )}
                
                {/* Progress Indicator */}
                {batchBackfill.isPending && batchProgress && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Processing {batchProgress.current} of {batchProgress.total} dates...
                      </span>
                      <span className="font-medium">
                        {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={(batchProgress.current / batchProgress.total) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Current: {format(new Date(batchProgress.currentDate + 'T12:00:00'), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setBatchDialogOpen(false)}
                  disabled={batchBackfill.isPending}
                >
                  {batchBackfill.isPending ? 'Running...' : 'Cancel'}
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
