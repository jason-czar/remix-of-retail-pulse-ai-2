import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NCSTimeRange = "7D" | "30D" | "90D";

export interface NCSDataPoint {
  date: string;
  score: number;
  risk_level: "low" | "moderate" | "high";
  dominant_narrative_share: number;
  message_count: number;
  unique_authors: number;
  confidence_score: number;
  period_type: string;
}

interface NarrativeCoherence {
  score: number;
  entropy: number;
  emotion_convergence: number;
  velocity_stability: number;
  dominant_narrative_share: number;
  risk_level: "low" | "moderate" | "high";
  risk_drivers: string[];
}

// Client-side fallback computation (same as NarrativeCoherenceCard)
function computeCoherenceFromState(observedState: any): NarrativeCoherence | null {
  if (!observedState?.narratives?.length) return null;
  
  const narratives = observedState.narratives;
  const emotions = observedState.emotions || [];
  
  const totalPrevalence = narratives.reduce((sum: number, n: any) => sum + (n.prevalence_pct || 0), 0);
  let entropy = 0;
  if (totalPrevalence > 0) {
    for (const n of narratives) {
      const p = (n.prevalence_pct || 0) / totalPrevalence;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(narratives.length);
    entropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
  }
  
  const bullishEmotions = emotions.filter((e: any) => e.polarity === "bullish").length;
  const bearishEmotions = emotions.filter((e: any) => e.polarity === "bearish").length;
  const totalPolarized = bullishEmotions + bearishEmotions;
  const emotionConvergence = totalPolarized > 0 
    ? Math.abs(bullishEmotions - bearishEmotions) / totalPolarized 
    : 0.5;
  
  const velocityMagnitudes = narratives.map((n: any) => n.velocity?.magnitude || 0);
  const avgVelocity = velocityMagnitudes.reduce((a: number, b: number) => a + b, 0) / velocityMagnitudes.length;
  const velocityStability = Math.max(0, 1 - avgVelocity);
  
  const dominantShare = narratives[0]?.prevalence_pct || 0;
  
  const score = Math.round(
    (1 - entropy) * 30 +
    emotionConvergence * 25 +
    velocityStability * 25 +
    (dominantShare / 100) * 20
  );
  
  const riskDrivers: string[] = [];
  let riskLevel: "low" | "moderate" | "high" = "low";
  
  if (entropy > 0.7) riskDrivers.push("Scattered narrative attention");
  if (emotionConvergence < 0.3) riskDrivers.push("Conflicting emotional signals");
  if (velocityStability < 0.4) riskDrivers.push("Rapid narrative shifts");
  if (dominantShare < 20) riskDrivers.push("No dominant narrative");
  
  if (riskDrivers.length >= 3 || score < 30) riskLevel = "high";
  else if (riskDrivers.length >= 1 || score < 50) riskLevel = "moderate";
  
  return {
    score,
    entropy: Math.round(entropy * 100) / 100,
    emotion_convergence: Math.round(emotionConvergence * 100) / 100,
    velocity_stability: Math.round(velocityStability * 100) / 100,
    dominant_narrative_share: dominantShare,
    risk_level: riskLevel,
    risk_drivers: riskDrivers,
  };
}

function getDaysFromRange(range: NCSTimeRange): number {
  switch (range) {
    case "7D": return 7;
    case "30D": return 30;
    case "90D": return 90;
  }
}

export function useNCSHistory(symbol: string, range: NCSTimeRange = "30D", enabled: boolean = true) {
  const days = getDaysFromRange(range);
  
  return useQuery({
    queryKey: ["ncs-history", symbol, range],
    queryFn: async (): Promise<NCSDataPoint[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Fetch daily snapshots preferentially, limit to reasonable count
      const { data: dailySnapshots, error: dailyError } = await supabase
        .from("psychology_snapshots")
        .select("snapshot_start, observed_state, message_count, unique_authors, data_confidence, period_type")
        .eq("symbol", symbol.toUpperCase())
        .eq("period_type", "daily")
        .gte("snapshot_start", startDate.toISOString())
        .order("snapshot_start", { ascending: true })
        .limit(days + 5);
      
      if (dailyError) throw dailyError;
      
      // If we don't have enough daily snapshots, supplement with hourly (aggregated)
      let allSnapshots = dailySnapshots || [];
      
      if (allSnapshots.length < 7) {
        // Fetch hourly and aggregate to daily
        const { data: hourlySnapshots, error: hourlyError } = await supabase
          .from("psychology_snapshots")
          .select("snapshot_start, observed_state, message_count, unique_authors, data_confidence, period_type")
          .eq("symbol", symbol.toUpperCase())
          .eq("period_type", "hourly")
          .gte("snapshot_start", startDate.toISOString())
          .order("snapshot_start", { ascending: true })
          .limit(days * 24);
        
        if (!hourlyError && hourlySnapshots?.length) {
          // Aggregate hourly to daily by taking the last snapshot of each day
          const dailyMap = new Map<string, typeof hourlySnapshots[0]>();
          
          for (const snap of hourlySnapshots) {
            const dateKey = snap.snapshot_start.split('T')[0];
            // Keep the latest snapshot for each day
            dailyMap.set(dateKey, snap);
          }
          
          // Merge with existing daily snapshots (daily takes precedence)
          const existingDates = new Set(allSnapshots.map(s => s.snapshot_start.split('T')[0]));
          
          for (const [dateKey, snap] of dailyMap) {
            if (!existingDates.has(dateKey)) {
              allSnapshots.push(snap);
            }
          }
          
          // Sort by date
          allSnapshots.sort((a, b) => 
            new Date(a.snapshot_start).getTime() - new Date(b.snapshot_start).getTime()
          );
        }
      }
      
      // Transform to NCS data points
      return allSnapshots.map(snapshot => {
        const observedState = snapshot.observed_state as any;
        const dataConfidence = snapshot.data_confidence as any;
        
        // Prefer server-computed coherence, fallback to client
        const serverCoherence = observedState?.coherence as NarrativeCoherence | undefined;
        const coherence = serverCoherence || computeCoherenceFromState(observedState);
        
        return {
          date: snapshot.snapshot_start.split('T')[0],
          score: coherence?.score ?? 0,
          risk_level: coherence?.risk_level ?? "moderate",
          dominant_narrative_share: coherence?.dominant_narrative_share ?? 0,
          message_count: snapshot.message_count,
          unique_authors: snapshot.unique_authors,
          confidence_score: dataConfidence?.score ?? 0,
          period_type: snapshot.period_type,
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    enabled: enabled && !!symbol,
  });
}
