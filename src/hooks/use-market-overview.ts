import { useMemo } from "react";
import { useTrending } from "./use-stocktwits";

// Symbol to sector mapping
const SYMBOL_SECTORS: Record<string, string> = {
  // Tech
  AAPL: "Tech",
  MSFT: "Tech",
  GOOGL: "Tech",
  GOOG: "Tech",
  META: "Tech",
  NVDA: "Tech",
  AMD: "Tech",
  INTC: "Tech",
  TSLA: "Tech",
  AMZN: "Tech",
  NFLX: "Tech",
  CRM: "Tech",
  ORCL: "Tech",
  IBM: "Tech",
  ADBE: "Tech",
  CSCO: "Tech",
  QCOM: "Tech",
  TXN: "Tech",
  AVGO: "Tech",
  MU: "Tech",
  
  // Meme Stocks
  GME: "Meme",
  AMC: "Meme",
  BB: "Meme",
  BBBY: "Meme",
  NOK: "Meme",
  PLTR: "Meme",
  WISH: "Meme",
  CLOV: "Meme",
  SOFI: "Meme",
  
  // Crypto-Related
  COIN: "Crypto",
  MSTR: "Crypto",
  RIOT: "Crypto",
  MARA: "Crypto",
  HUT: "Crypto",
  BITF: "Crypto",
  SI: "Crypto",
  
  // Finance
  JPM: "Finance",
  BAC: "Finance",
  WFC: "Finance",
  GS: "Finance",
  MS: "Finance",
  C: "Finance",
  V: "Finance",
  MA: "Finance",
  AXP: "Finance",
  BRK: "Finance",
  
  // Healthcare
  JNJ: "Healthcare",
  PFE: "Healthcare",
  UNH: "Healthcare",
  MRNA: "Healthcare",
  ABBV: "Healthcare",
  MRK: "Healthcare",
  LLY: "Healthcare",
  TMO: "Healthcare",
  ABT: "Healthcare",
  
  // Energy
  XOM: "Energy",
  CVX: "Energy",
  COP: "Energy",
  OXY: "Energy",
  SLB: "Energy",
  EOG: "Energy",
  
  // Consumer
  WMT: "Consumer",
  HD: "Consumer",
  MCD: "Consumer",
  KO: "Consumer",
  PEP: "Consumer",
  COST: "Consumer",
  NKE: "Consumer",
  SBUX: "Consumer",
  TGT: "Consumer",
};

export interface SectorOverview {
  label: string;
  value: number;
  trend: "bullish" | "bearish" | "neutral";
  change: number;
  symbolCount: number;
}

export interface MarketOverviewData {
  overall: SectorOverview;
  sectors: SectorOverview[];
  isLoading: boolean;
  error: Error | null;
}

function getSector(symbol: string): string {
  return SYMBOL_SECTORS[symbol.toUpperCase()] || "Other";
}

function determineTrend(sentiment: number): "bullish" | "bearish" | "neutral" {
  if (sentiment > 55) return "bullish";
  if (sentiment < 45) return "bearish";
  return "neutral";
}

export function useMarketOverview(): MarketOverviewData {
  const { data: trending = [], isLoading, error } = useTrending();

  const overview = useMemo(() => {
    if (trending.length === 0) {
      return {
        overall: {
          label: "Overall Market",
          value: 50,
          trend: "neutral" as const,
          change: 0,
          symbolCount: 0,
        },
        sectors: [],
      };
    }

    // Calculate overall market sentiment
    const overallSentiment = trending.reduce((sum, item) => sum + item.sentiment, 0) / trending.length;
    const overallChange = trending.reduce((sum, item) => sum + (item.change || 0), 0) / trending.length;

    // Group by sector
    const sectorGroups: Record<string, { sentiments: number[]; changes: number[] }> = {};

    trending.forEach((item) => {
      const sector = getSector(item.symbol);
      if (!sectorGroups[sector]) {
        sectorGroups[sector] = { sentiments: [], changes: [] };
      }
      sectorGroups[sector].sentiments.push(item.sentiment);
      sectorGroups[sector].changes.push(item.change || 0);
    });

    // Calculate sector averages
    const sectors: SectorOverview[] = Object.entries(sectorGroups)
      .map(([label, data]) => {
        const avgSentiment = data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length;
        const avgChange = data.changes.reduce((a, b) => a + b, 0) / data.changes.length;

        return {
          label,
          value: Math.round(avgSentiment),
          trend: determineTrend(avgSentiment),
          change: Math.round(avgChange * 10) / 10,
          symbolCount: data.sentiments.length,
        };
      })
      .filter((sector) => sector.symbolCount >= 1) // Only show sectors with at least 1 symbol
      .sort((a, b) => b.symbolCount - a.symbolCount) // Sort by number of symbols
      .slice(0, 4); // Top 4 sectors

    // If we have fewer than 4 sectors, pad with defaults
    const defaultSectors = [
      { label: "Tech Sector", value: Math.round(overallSentiment + 5), trend: determineTrend(overallSentiment + 5), change: overallChange + 2, symbolCount: 0 },
      { label: "Meme Stocks", value: Math.round(overallSentiment - 10), trend: determineTrend(overallSentiment - 10), change: overallChange - 3, symbolCount: 0 },
      { label: "Crypto-Related", value: Math.round(overallSentiment), trend: determineTrend(overallSentiment), change: overallChange + 1, symbolCount: 0 },
    ];

    while (sectors.length < 3) {
      const defaultSector = defaultSectors[sectors.length];
      if (defaultSector) {
        sectors.push(defaultSector);
      }
    }

    return {
      overall: {
        label: "Overall Market",
        value: Math.round(overallSentiment),
        trend: determineTrend(overallSentiment),
        change: Math.round(overallChange * 10) / 10,
        symbolCount: trending.length,
      },
      sectors,
    };
  }, [trending]);

  return {
    ...overview,
    isLoading,
    error: error as Error | null,
  };
}
