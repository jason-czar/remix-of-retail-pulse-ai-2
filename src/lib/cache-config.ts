/**
 * Cache TTL configuration aligned between frontend and backend
 * 
 * Frontend staleTime should be slightly less than backend TTL
 * to ensure fresh data is available when cache expires.
 */

export const CACHE_TTL = {
  // AI Analysis caches (2-hour backend TTL)
  EMOTION_ANALYSIS: {
    backend: 2 * 60 * 60 * 1000,    // 2 hours
    staleTime: 90 * 60 * 1000,      // 90 minutes
    gcTime: 2 * 60 * 60 * 1000,     // 2 hours
  },
  NARRATIVE_ANALYSIS: {
    backend: 2 * 60 * 60 * 1000,
    staleTime: 90 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  },
  
  // Lens summaries (30-min backend TTL)
  LENS_SUMMARY: {
    backend: 30 * 60 * 1000,        // 30 minutes
    staleTime: 25 * 60 * 1000,      // 25 minutes
    gcTime: 45 * 60 * 1000,         // 45 minutes
  },
  
  // History data (served from database, 5-min staleness acceptable)
  HISTORY: {
    staleTime: 5 * 60 * 1000,       // 5 minutes
    gcTime: 15 * 60 * 1000,         // 15 minutes
  },
  
  // Real-time data (short TTLs)
  SYMBOL_STATS: {
    staleTime: 15 * 1000,           // 15 seconds
    refetchInterval: 30 * 1000,     // 30 seconds
  },
  MESSAGES: {
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  },
  TRENDING: {
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  },
} as const;

// Grace period for stale-while-revalidate pattern
export const SWR_GRACE_PERIOD = 5 * 60 * 1000; // 5 minutes
