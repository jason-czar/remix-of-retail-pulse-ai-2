import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CacheEntry<T> {
  data: T;
  source: 'cache' | 'api' | 'history';
  snapshotCount?: number;
}

// Check if cache entry is still valid
function isCacheValid(expiresAt: string): boolean {
  return new Date(expiresAt) > new Date();
}

// Get volume data from cache
async function getVolumeFromCache(symbol: string, timeRange: string) {
  const { data, error } = await supabase
    .from('volume_cache')
    .select('*')
    .eq('symbol', symbol)
    .eq('time_range', timeRange)
    .maybeSingle();

  if (error || !data) return null;
  if (!isCacheValid(data.expires_at)) return null;

  return data;
}

// Get sentiment from cache
async function getSentimentFromCache(symbol: string, timeRange: string) {
  const { data, error } = await supabase
    .from('sentiment_cache')
    .select('*')
    .eq('symbol', symbol)
    .eq('time_range', timeRange)
    .maybeSingle();

  if (error || !data) return null;
  if (!isCacheValid(data.expires_at)) return null;

  return data;
}

// Get volume from history for 7D/30D aggregation
async function getVolumeFromHistory(symbol: string, timeRange: string): Promise<any[] | null> {
  const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : null;
  if (!days) return null;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('volume_history')
    .select('recorded_at, message_count, daily_volume')
    .eq('symbol', symbol)
    .eq('period_type', 'daily')
    .gte('recorded_at', startDate.toISOString())
    .order('recorded_at', { ascending: true });

  if (error || !data || data.length < (days === 7 ? 5 : 15)) {
    return null; // Not enough historical data
  }

  return data.map(item => ({
    time: formatDateLabel(item.recorded_at),
    volume: item.daily_volume || item.message_count,
    recorded_at: item.recorded_at,
  }));
}

// Get sentiment from history for 7D/30D aggregation
async function getSentimentFromHistory(symbol: string, timeRange: string): Promise<any[] | null> {
  const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : null;
  if (!days) return null;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('sentiment_history')
    .select('recorded_at, sentiment_score, bullish_count, bearish_count')
    .eq('symbol', symbol)
    .gte('recorded_at', startDate.toISOString())
    .order('recorded_at', { ascending: true });

  if (error || !data || data.length < (days === 7 ? 5 : 15)) {
    return null;
  }

  return data.map(item => ({
    time: formatDateLabel(item.recorded_at),
    sentiment: item.sentiment_score,
    bullish: item.bullish_count,
    bearish: item.bearish_count,
    recorded_at: item.recorded_at,
  }));
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Hook for cached volume analytics
export function useCachedVolumeAnalytics(
  symbol: string,
  timeRange: string = '24H',
  options?: { skipCache?: boolean }
) {
  return useQuery({
    queryKey: ['cached-volume', symbol, timeRange, options?.skipCache],
    queryFn: async (): Promise<CacheEntry<any[]>> => {
      // Skip cache if requested
      if (!options?.skipCache) {
        // Try cache first
        const cached = await getVolumeFromCache(symbol, timeRange);
        if (cached) {
          const data = timeRange === '7D' || timeRange === '30D'
            ? (cached.daily_data as any[]) || []
            : (cached.hourly_data as any[]) || [];

          if (data.length > 0) {
            return { data, source: 'cache' };
          }
        }

        // Try history aggregation for 7D/30D
        if (timeRange === '7D' || timeRange === '30D') {
          const historyData = await getVolumeFromHistory(symbol, timeRange);
          if (historyData && historyData.length > 0) {
            return { 
              data: historyData, 
              source: 'history',
              snapshotCount: historyData.length 
            };
          }
        }
      }

      // Fall back to API (handled by existing hook)
      return { data: [], source: 'api' };
    },
    enabled: !!symbol,
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

// Hook for cached sentiment analytics
export function useCachedSentimentAnalytics(
  symbol: string,
  timeRange: string = '24H',
  options?: { skipCache?: boolean }
) {
  return useQuery({
    queryKey: ['cached-sentiment', symbol, timeRange, options?.skipCache],
    queryFn: async (): Promise<CacheEntry<any[]>> => {
      if (!options?.skipCache) {
        // Try cache first
        const cached = await getSentimentFromCache(symbol, timeRange);
        if (cached) {
          const data = timeRange === '7D' || timeRange === '30D'
            ? (cached.daily_data as any[]) || []
            : (cached.hourly_data as any[]) || [];

          if (data.length > 0) {
            return { data, source: 'cache' };
          }
        }

        // Try history aggregation for 7D/30D
        if (timeRange === '7D' || timeRange === '30D') {
          const historyData = await getSentimentFromHistory(symbol, timeRange);
          if (historyData && historyData.length > 0) {
            return { 
              data: historyData, 
              source: 'history',
              snapshotCount: historyData.length 
            };
          }
        }
      }

      return { data: [], source: 'api' };
    },
    enabled: !!symbol,
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

// Combined hook that merges cache with API data
export function useVolumeWithCache(
  symbol: string,
  timeRange: string = '24H',
  start?: string,
  end?: string
) {
  const cacheQuery = useCachedVolumeAnalytics(symbol, timeRange);

  return {
    ...cacheQuery,
    isCached: cacheQuery.data?.source === 'cache',
    isFromHistory: cacheQuery.data?.source === 'history',
    snapshotCount: cacheQuery.data?.snapshotCount,
    volumeData: cacheQuery.data?.data || [],
  };
}

export function useSentimentWithCache(
  symbol: string,
  timeRange: string = '24H',
  start?: string,
  end?: string
) {
  const cacheQuery = useCachedSentimentAnalytics(symbol, timeRange);

  return {
    ...cacheQuery,
    isCached: cacheQuery.data?.source === 'cache',
    isFromHistory: cacheQuery.data?.source === 'history',
    snapshotCount: cacheQuery.data?.snapshotCount,
    sentimentData: cacheQuery.data?.data || [],
  };
}
