import { supabase } from "@/integrations/supabase/client";

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stocktwits-proxy`;

async function callApi(action: string, params: Record<string, string> = {}) {
  const queryParams = new URLSearchParams({ action, ...params });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(`${EDGE_FUNCTION_URL}?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
}

export interface TrendingSymbol {
  symbol: string;
  name?: string;
  sentiment: number;
  volume: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  change?: number;
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
  content: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  emotions: string[];
  time: string;
  created_at: string;
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

export const stocktwitsApi = {
  // Get trending symbols
  async getTrending(): Promise<TrendingSymbol[]> {
    try {
      const data = await callApi('trending');
      
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          symbol: item.symbol || item.ticker,
          name: item.name || item.title,
          sentiment: item.sentiment_score || item.sentiment || 50,
          volume: item.message_count || item.volume || 0,
          trend: item.sentiment_score > 55 ? 'bullish' : item.sentiment_score < 45 ? 'bearish' : 'neutral',
          change: item.change || 0,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch trending:', error);
      return [];
    }
  },

  // Get symbol stats
  async getSymbolStats(symbol: string): Promise<SymbolStats | null> {
    try {
      const data = await callApi('stats', { symbol });
      
      if (data) {
        const sentiment = data.sentiment_score || data.sentiment || 50;
        return {
          symbol: data.symbol || symbol,
          name: data.name || data.title || symbol,
          sentiment,
          sentimentChange: data.sentiment_change || data.change_24h || 0,
          trend: sentiment > 55 ? 'bullish' : sentiment < 45 ? 'bearish' : 'neutral',
          volume: formatVolume(data.message_count || data.volume || 0),
          volumeChange: data.volume_change || 0,
          badges: data.badges || [],
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch symbol stats:', error);
      return null;
    }
  },

  // Get messages for a symbol
  async getMessages(symbol: string, limit = 50): Promise<Message[]> {
    try {
      const data = await callApi('messages', { symbol, limit: limit.toString() });
      
      if (Array.isArray(data)) {
        return data.map((msg: any) => ({
          id: msg.id || msg.message_id,
          user: msg.username || msg.user?.username || 'anonymous',
          content: msg.body || msg.content || msg.text,
          sentiment: mapSentiment(msg.sentiment),
          emotions: msg.emotions || [],
          time: formatTime(msg.created_at),
          created_at: msg.created_at,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return [];
    }
  },

  // Get sentiment analytics
  async getSentimentAnalytics(symbol: string, type = 'hourly'): Promise<SentimentData[]> {
    try {
      const data = await callApi('analytics', { symbol, type });
      
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          time: formatChartTime(item.timestamp || item.time || item.hour),
          sentiment: item.sentiment_score || item.sentiment || 50,
          bullish: item.bullish_count || item.bullish || 0,
          bearish: item.bearish_count || item.bearish || 0,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch sentiment analytics:', error);
      return [];
    }
  },

  // Get volume analytics
  async getVolumeAnalytics(symbol: string): Promise<VolumeData[]> {
    try {
      const data = await callApi('analytics', { symbol, type: 'volume' });
      
      if (Array.isArray(data)) {
        const baseline = calculateBaseline(data.map((item: any) => item.count || item.volume || 0));
        
        return data.map((item: any) => {
          const volume = item.count || item.volume || 0;
          return {
            time: formatChartTime(item.timestamp || item.time || item.hour),
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

  // Get sentiment for a symbol
  async getSentiment(symbol: string): Promise<{ score: number; trend: string; summary?: string } | null> {
    try {
      const data = await callApi('sentiment', { symbol });
      
      if (data) {
        return {
          score: data.sentiment_score || data.score || 50,
          trend: data.trend || (data.sentiment_score > 55 ? 'bullish' : data.sentiment_score < 45 ? 'bearish' : 'neutral'),
          summary: data.summary || data.ai_summary,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch sentiment:', error);
      return null;
    }
  },
};

// Helper functions
function formatVolume(volume: number): string {
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(0)}K`;
  return volume.toString();
}

function mapSentiment(sentiment: any): 'bullish' | 'bearish' | 'neutral' {
  if (typeof sentiment === 'string') {
    if (sentiment.toLowerCase() === 'bullish') return 'bullish';
    if (sentiment.toLowerCase() === 'bearish') return 'bearish';
    return 'neutral';
  }
  if (typeof sentiment === 'number') {
    if (sentiment > 0) return 'bullish';
    if (sentiment < 0) return 'bearish';
    return 'neutral';
  }
  return 'neutral';
}

function formatTime(timestamp: string): string {
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

function formatChartTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function calculateBaseline(volumes: number[]): number {
  if (volumes.length === 0) return 0;
  const sum = volumes.reduce((a, b) => a + b, 0);
  return Math.floor(sum / volumes.length);
}