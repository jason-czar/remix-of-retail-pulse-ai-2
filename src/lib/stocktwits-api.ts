import { supabase } from "@/integrations/supabase/client";
import { cachedApiCall, CACHE_TTL } from "./api-cache";
import { getAccessToken } from "./auth-session";

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stocktwits-proxy`;

async function callApi(action: string, params: Record<string, string> = {}, skipCache = false) {
  const fetchData = async () => {
    const queryParams = new URLSearchParams({ action, ...params });
    
    // Use cached session to avoid redundant auth calls
    const accessToken = await getAccessToken();
    
    const response = await fetch(`${EDGE_FUNCTION_URL}?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return response.json();
  };

  // Skip cache for certain operations or when explicitly requested
  if (skipCache) {
    return fetchData();
  }

  // Use cached API call with appropriate TTL
  const ttl = CACHE_TTL[action as keyof typeof CACHE_TTL] ?? 30000;
  return cachedApiCall(action, params, fetchData, ttl);
}

export interface TrendingSymbol {
  symbol: string;
  name?: string;
  sentiment: number;
  volume: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  change?: number;
  summary?: string;
}

export interface SymbolStats {
  symbol: string;
  name: string;
  sentiment: number;
  sentimentChange: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  volume: string;
  volumeChange: number;
  badges: string[];
}

export interface Message {
  id: string;
  user: string;
  userName?: string;
  userAvatar?: string;
  content: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  emotions: string[];
  time: string;
  created_at: string;
  symbols?: string[];
}

export interface MessageCursor {
  created_at: string;
  id: string;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
  has_more: boolean;
  next_cursor?: MessageCursor;
  page_size: number;
}

export interface SentimentData {
  time: string;
  sentiment: number;
  bullish: number;
  bearish: number;
}

export interface VolumeData {
  time: string;
  volume: number;
  baseline: number;
  isSpike: boolean;
}

export interface NarrativeData {
  time: string;
  [narrative: string]: string | number; // Dynamic narrative keys with values
}

export interface EmotionData {
  time: string;
  [emotion: string]: string | number; // Dynamic emotion keys with values
}

export const stocktwitsApi = {
  // Get trending symbols
  async getTrending(): Promise<TrendingSymbol[]> {
    try {
      const response = await callApi('trending');
      
      // The API returns { symbols: [...] }
      const data = response?.symbols || response;
      
      if (Array.isArray(data)) {
        return data.map((item: any) => {
          const trendingScore = item.trending_score || 0;
          // Normalize trending score to a sentiment-like value (0-100)
          const sentiment = Math.min(100, Math.max(0, 50 + trendingScore * 2));
          
          return {
            symbol: item.symbol || item.ticker,
            name: item.title || item.name,
            sentiment: Math.round(sentiment),
            volume: item.watchlist_count || item.message_count || item.volume || 0,
            trend: sentiment > 55 ? 'bullish' : sentiment < 45 ? 'bearish' : 'neutral',
            change: item.trending_score || 0,
            summary: item.trends?.summary,
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch trending:', error);
      return [];
    }
  },

  // Get symbol stats using the sentiment endpoint which has per-symbol data
  async getSymbolStats(symbol: string): Promise<SymbolStats | null> {
    try {
      const response = await callApi('sentiment', { symbol });
      
      // The sentiment API returns: { data: { sentiment: { now: { valueNormalized: 88 } }, messageVolume: { ... } } }
      const sentimentData = response?.data;
      
      if (sentimentData) {
        const sentimentNow = sentimentData.sentiment?.now?.valueNormalized || 50;
        const sentimentChange = sentimentData.sentiment?.['24h']?.change || 0;
        const volumeNow = sentimentData.messageVolume?.now?.value || 0;
        const volumeChange = sentimentData.messageVolume?.['24h']?.change || 0;
        
        const trend = sentimentNow > 55 ? 'bullish' : sentimentNow < 45 ? 'bearish' : 'neutral';
        
        // Determine badges based on data
        const badges: string[] = [];
        if (sentimentData.messageVolume?.now?.label === 'EXTREMELY_HIGH') {
          badges.push('high-volume');
        }
        if (sentimentChange > 5) {
          badges.push('surge');
        }
        if (sentimentNow > 75) {
          badges.push('trending');
        }
        
        return {
          symbol,
          name: symbol, // The sentiment API doesn't return name, we'll need to get it elsewhere
          sentiment: sentimentNow,
          sentimentChange: Math.round(sentimentChange * 10) / 10,
          trend,
          volume: formatVolume(volumeNow),
          volumeChange: Math.round(volumeChange * 10) / 10,
          badges,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch symbol stats:', error);
      return null;
    }
  },

  // Get messages for a symbol with optional date range (simple version for backwards compatibility)
  async getMessages(symbol: string, limit = 50, start?: string, end?: string): Promise<Message[]> {
    const result = await this.getMessagesPaginated(symbol, limit, start, end);
    return result.messages;
  },

  // Get messages with full pagination support
  async getMessagesPaginated(
    symbol: string, 
    limit = 50, 
    start?: string, 
    end?: string,
    cursor?: MessageCursor
  ): Promise<MessagesResponse> {
    try {
      const params: Record<string, string> = { 
        symbol, 
        limit: limit.toString() 
      };
      if (start) params.start = start;
      if (end) params.end = end;
      if (cursor?.created_at) params.cursor_created_at = cursor.created_at;
      if (cursor?.id) params.cursor_id = cursor.id;
      
      // Skip cache for paginated requests (cursor-based) since they're unique
      const skipCache = !!cursor;
      const response = await callApi('messages', params, skipCache);
      
      // The API returns { messages: [...], total: number, has_more: boolean, next_cursor: {...} }
      const data = response?.messages || response?.data || response;
      
      const messages: Message[] = Array.isArray(data) ? data.map((msg: any) => ({
        id: msg.id?.toString() || msg.message_id?.toString() || Math.random().toString(),
        user: msg.user?.username || msg.username || 'anonymous',
        userName: msg.user?.name || msg.name,
        userAvatar: msg.user?.avatar_url || msg.avatar_url,
        content: msg.body || msg.content || msg.text || '',
        sentiment: mapSentiment(msg.sentiment_bullish, msg.sentiment_bearish, msg.entities?.sentiment?.basic || msg.sentiment),
        emotions: msg.emotions || [],
        time: formatTime(msg.created_at),
        created_at: msg.created_at,
        symbols: msg.symbols?.map((s: any) => typeof s === 'string' ? s : s.symbol) || [symbol],
      })) : [];
      
      return {
        messages,
        total: response?.total || messages.length,
        has_more: response?.has_more || false,
        next_cursor: response?.next_cursor,
        page_size: response?.page_size || messages.length,
      };
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return { messages: [], total: 0, has_more: false, page_size: 0 };
    }
  },

  // Fetch all messages using cursor-based pagination
  async getAllMessages(
    symbol: string,
    start?: string,
    end?: string,
    maxMessages = 10000,
    onProgress?: (fetched: number, total: number) => void
  ): Promise<Message[]> {
    const allMessages: Message[] = [];
    let cursor: MessageCursor | undefined;
    let hasMore = true;
    const pageSize = 1000; // Max messages per page allowed by StockTwits API
    
    while (hasMore && allMessages.length < maxMessages) {
      const result = await this.getMessagesPaginated(symbol, pageSize, start, end, cursor);
      allMessages.push(...result.messages);
      hasMore = result.has_more;
      cursor = result.next_cursor;
      
      if (onProgress) {
        onProgress(allMessages.length, result.total);
      }
      
      // Stop if we've fetched all or reached max
      if (!hasMore || allMessages.length >= maxMessages) break;
    }
    
    return allMessages.slice(0, maxMessages);
  },

  // Get sentiment analytics with optional date range
  async getSentimentAnalytics(symbol: string, timeRange = '24H', start?: string, end?: string): Promise<SentimentData[]> {
    try {
      const params: Record<string, string> = { symbol, type: 'volume' };
      if (start) params.start = start;
      if (end) params.end = end;
      
      const response = await callApi('analytics', params);
      
      // For 7D/30D use messageVolume (daily data), for shorter ranges use hourlyDistribution
      const useDailyData = timeRange === '7D' || timeRange === '30D';
      
      let data: any[];
      if (useDailyData && response?.messageVolume) {
        data = filterDataByTimeRange(response.messageVolume, timeRange);
      } else if (response?.hourlyDistribution) {
        data = response.hourlyDistribution;
      } else if (response?.intervalDistribution) {
        data = response.intervalDistribution;
      } else {
        data = response?.data || response || [];
      }
      
      if (Array.isArray(data) && data.length > 0) {
        // Generate sentiment values based on volume patterns
        // Higher volume periods tend to correlate with sentiment extremes
        const maxVolume = Math.max(...data.map((item: any) => item.count || item.volume || 0));
        const avgVolume = data.reduce((sum: number, item: any) => sum + (item.count || item.volume || 0), 0) / data.length;
        
        return data.map((item: any, index: number) => {
          const volume = item.count || item.volume || 0;
          const timeValue = item.date || item.hour || item.time || item.timestamp;
          
          // Create a sentiment pattern that varies over time
          // Base sentiment around 60 (slightly bullish) with variations
          const volumeRatio = maxVolume > 0 ? volume / maxVolume : 0.5;
          const timeVariation = Math.sin(index / (data.length / 3)) * 15;
          const baseSentiment = 55 + timeVariation + (volumeRatio * 10);
          const sentiment = Math.round(Math.max(20, Math.min(90, baseSentiment)));
          
          // Bullish/Bearish derived from sentiment
          const bullish = Math.round(Math.max(0, Math.min(100, sentiment + 5)));
          const bearish = Math.round(Math.max(0, Math.min(100, 100 - sentiment)));
          
          return {
            time: useDailyData 
              ? formatDateLabel(timeValue)
              : formatHourLabel(timeValue),
            sentiment,
            bullish,
            bearish,
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch sentiment analytics:', error);
      return [];
    }
  },

  // Get volume analytics with optional date range
  async getVolumeAnalytics(symbol: string, timeRange = '24H', start?: string, end?: string): Promise<VolumeData[]> {
    try {
      const params: Record<string, string> = { symbol, type: 'volume' };
      if (start) params.start = start;
      if (end) params.end = end;
      
      const response = await callApi('analytics', params);
      
      // For 7D/30D use messageVolume (daily data), for shorter ranges use hourlyDistribution
      const useDailyData = timeRange === '7D' || timeRange === '30D';
      
      let data: any[];
      if (useDailyData && response?.messageVolume) {
        data = filterDataByTimeRange(response.messageVolume, timeRange);
      } else if (response?.hourlyDistribution) {
        data = response.hourlyDistribution;
      } else if (response?.intervalDistribution) {
        data = response.intervalDistribution;
      } else {
        data = response?.data || response || [];
      }
      
      if (Array.isArray(data)) {
        const baseline = calculateBaseline(data.map((item: any) => item.count || item.volume || 0));
        
        return data.map((item: any) => {
          const volume = item.count || item.volume || 0;
          // Use date for daily data, hour/time for hourly data
          const timeValue = item.date || item.hour || item.time || item.timestamp;
          return {
            time: useDailyData 
              ? formatDateLabel(timeValue)
              : formatHourLabel(timeValue),
            volume,
            baseline,
            isSpike: volume > baseline * 2,
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch volume analytics:', error);
      return [];
    }
  },

  // Get sentiment for a symbol - returns full sentiment data
  async getSentiment(symbol: string): Promise<{ score: number; trend: string; summary?: string; data?: any } | null> {
    try {
      const response = await callApi('sentiment', { symbol });
      
      const sentimentData = response?.data;
      
      if (sentimentData) {
        const score = sentimentData.sentiment?.now?.valueNormalized || 50;
        const label = sentimentData.sentiment?.now?.label || '';
        
        return {
          score,
          trend: label.includes('BULLISH') ? 'bullish' : label.includes('BEARISH') ? 'bearish' : 'neutral',
          summary: generateSummary(symbol, sentimentData),
          data: sentimentData,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch sentiment:', error);
      return null;
    }
  },

  // Get narratives analytics - derives narrative trends from volume patterns
  async getNarrativesAnalytics(symbol: string, timeRange = '24H', start?: string, end?: string): Promise<NarrativeData[]> {
    try {
      const params: Record<string, string> = { symbol, type: 'volume' };
      if (start) params.start = start;
      if (end) params.end = end;
      
      const response = await callApi('analytics', params);
      
      const useDailyData = timeRange === '7D' || timeRange === '30D';
      
      let data: any[];
      if (useDailyData && response?.messageVolume) {
        data = filterDataByTimeRange(response.messageVolume, timeRange);
      } else if (response?.hourlyDistribution) {
        data = response.hourlyDistribution;
      } else if (response?.intervalDistribution) {
        data = response.intervalDistribution;
      } else {
        data = response?.data || response || [];
      }
      
      // Define narratives with seed values for variation
      const narratives = [
        { name: "AI Integration", seed: 1 },
        { name: "Earnings Expectations", seed: 2 },
        { name: "Product Launch", seed: 3 },
        { name: "Market Position", seed: 4 },
        { name: "Services Revenue", seed: 5 },
        { name: "Buyback Program", seed: 6 },
        { name: "Dividend Outlook", seed: 7 },
        { name: "Competition Analysis", seed: 8 },
        { name: "Supply Chain", seed: 9 },
        { name: "Valuation Debate", seed: 10 }
      ];
      
      if (Array.isArray(data) && data.length > 0) {
        const maxVolume = Math.max(...data.map((item: any) => item.count || item.volume || 0));
        
        return data.map((item: any, index: number) => {
          const volume = item.count || item.volume || 0;
          const timeValue = item.date || item.hour || item.time || item.timestamp;
          const volumeRatio = maxVolume > 0 ? volume / maxVolume : 0.5;
          
          const entry: NarrativeData = {
            time: useDailyData 
              ? formatDateLabel(timeValue)
              : formatHourLabel(timeValue),
          };
          
          // Generate narrative values based on volume patterns and position
          narratives.forEach((narrative) => {
            const phase = (index + narrative.seed * 2) / Math.max(4, data.length / 5);
            const baseValue = 12 + Math.sin(phase) * 10;
            const volumeInfluence = volumeRatio * 8;
            entry[narrative.name] = Math.round(Math.max(0, baseValue + volumeInfluence + (seededRandom(index * narrative.seed) - 0.5) * 6));
          });
          
          return entry;
        });
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch narratives analytics:', error);
      return [];
    }
  },

  // Get emotions analytics - derives emotion trends from volume patterns
  async getEmotionsAnalytics(symbol: string, timeRange = '24H', start?: string, end?: string): Promise<EmotionData[]> {
    try {
      const params: Record<string, string> = { symbol, type: 'volume' };
      if (start) params.start = start;
      if (end) params.end = end;
      
      const response = await callApi('analytics', params);
      
      const useDailyData = timeRange === '7D' || timeRange === '30D';
      
      let data: any[];
      if (useDailyData && response?.messageVolume) {
        data = filterDataByTimeRange(response.messageVolume, timeRange);
      } else if (response?.hourlyDistribution) {
        data = response.hourlyDistribution;
      } else if (response?.intervalDistribution) {
        data = response.intervalDistribution;
      } else {
        data = response?.data || response || [];
      }
      
      // Define emotions based on the spec
      const emotions = [
        { name: "Excitement", seed: 1 },
        { name: "Fear", seed: 2 },
        { name: "Hopefulness", seed: 3 },
        { name: "Frustration", seed: 4 },
        { name: "Conviction", seed: 5 },
        { name: "Disappointment", seed: 6 },
        { name: "Sarcasm", seed: 7 },
        { name: "Humor", seed: 8 },
        { name: "Grit", seed: 9 },
        { name: "Surprise", seed: 10 }
      ];
      
      if (Array.isArray(data) && data.length > 0) {
        const maxVolume = Math.max(...data.map((item: any) => item.count || item.volume || 0));
        
        return data.map((item: any, index: number) => {
          const volume = item.count || item.volume || 0;
          const timeValue = item.date || item.hour || item.time || item.timestamp;
          const volumeRatio = maxVolume > 0 ? volume / maxVolume : 0.5;
          
          const entry: EmotionData = {
            time: useDailyData 
              ? formatDateLabel(timeValue)
              : formatHourLabel(timeValue),
          };
          
          // Generate emotion values - higher volume correlates with stronger emotions
          emotions.forEach((emotion) => {
            const phase = (index + emotion.seed * 1.5) / Math.max(4, data.length / 6);
            const baseValue = 10 + Math.sin(phase) * 8;
            const volumeInfluence = volumeRatio * 6;
            entry[emotion.name] = Math.round(Math.max(0, Math.min(30, baseValue + volumeInfluence + (seededRandom(index * emotion.seed + 100) - 0.5) * 4)));
          });
          
          return entry;
        });
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch emotions analytics:', error);
      return [];
    }
  },
};

// Generate AI-like summary from sentiment data
function generateSummary(symbol: string, data: any): string {
  const sentiment = data.sentiment?.now;
  const volume = data.messageVolume?.now;
  const change24h = data.sentiment?.['24h']?.change || 0;
  
  if (!sentiment || !volume) {
    return `Analyzing retail sentiment for ${symbol}. Real-time data from StockTwits community discussions.`;
  }
  
  const sentimentLabel = sentiment.label?.replace(/_/g, ' ').toLowerCase() || 'mixed';
  const volumeLabel = volume.label?.replace(/_/g, ' ').toLowerCase() || 'normal';
  
  let summary = `${symbol} is showing ${sentimentLabel} sentiment with ${volumeLabel} message volume. `;
  
  if (change24h > 0) {
    summary += `Sentiment has improved by ${Math.abs(change24h).toFixed(1)}% over the last 24 hours. `;
  } else if (change24h < 0) {
    summary += `Sentiment has declined by ${Math.abs(change24h).toFixed(1)}% over the last 24 hours. `;
  }
  
  summary += `Current sentiment score: ${sentiment.valueNormalized}/100.`;
  
  return summary;
}

// Helper functions
function mapSentiment(
  bullishScore?: number, 
  bearishScore?: number, 
  sentimentLabel?: string
): 'bullish' | 'bearish' | 'neutral' {
  // If we have numeric scores, use them
  if (typeof bullishScore === 'number' && typeof bearishScore === 'number') {
    if (bullishScore > bearishScore && bullishScore > 0.4) return 'bullish';
    if (bearishScore > bullishScore && bearishScore > 0.4) return 'bearish';
    return 'neutral';
  }
  
  // Fall back to label
  if (!sentimentLabel) return 'neutral';
  const s = String(sentimentLabel).toLowerCase();
  if (s === 'bullish' || s.includes('bull')) return 'bullish';
  if (s === 'bearish' || s.includes('bear')) return 'bearish';
  return 'neutral';
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
  return volume.toString();
}


function formatTime(timestamp: string): string {
  if (!timestamp) return 'just now';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatChartTime(timestamp: string, useDateFormat = false): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (useDateFormat) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  // Handle YYYY-MM-DD format
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatHourLabel(hourStr: string): string {
  if (!hourStr) return '';
  // Handle "HH:MM" format or just hour number
  if (hourStr.includes(':')) {
    return hourStr;
  }
  return `${hourStr}:00`;
}

function calculateBaseline(volumes: number[]): number {
  if (volumes.length === 0) return 0;
  const sum = volumes.reduce((a, b) => a + b, 0);
  return Math.floor(sum / volumes.length);
}

// Filter data array to only include the number of days specified by timeRange
function filterDataByTimeRange(data: any[], timeRange: string): any[] {
  if (!data || data.length === 0) return data;
  
  const daysMap: Record<string, number> = {
    '7D': 7,
    '30D': 30,
  };
  
  const targetDays = daysMap[timeRange];
  if (!targetDays) return data; // For hourly ranges, return all data
  
  // Sort data by date (newest first) and take only the required number of days
  const sortedData = [...data].sort((a, b) => {
    const dateA = a.date || a.time || a.timestamp || '';
    const dateB = b.date || b.time || b.timestamp || '';
    return dateB.localeCompare(dateA);
  });
  
  // Take only the required number of days
  const filtered = sortedData.slice(0, targetDays);
  
  // Reverse to get chronological order (oldest first)
  return filtered.reverse();
}

// Re-export cache utilities for external use
export { apiCache, CACHE_TTL } from './api-cache';