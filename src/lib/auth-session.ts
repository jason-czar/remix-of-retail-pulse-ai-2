/**
 * Auth Session Cache
 * 
 * Pre-warms and caches the Supabase auth session to eliminate redundant
 * getSession() calls across hooks. Each call to getSession() would otherwise
 * trigger a network request for token refresh checks.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

// Module-level cache for session (persists for tab lifetime)
let cachedSession: Session | null = null;
let sessionPromise: Promise<Session | null> | null = null;
let lastRefreshTime = 0;

// Session refresh interval (10 minutes) - don't re-check too often
const SESSION_REFRESH_INTERVAL = 10 * 60 * 1000;

/**
 * Get the cached auth session, or fetch if needed.
 * First call fetches from Supabase, subsequent calls return cached value.
 * Auto-refreshes if cached session is older than SESSION_REFRESH_INTERVAL.
 */
export async function getCachedSession(): Promise<Session | null> {
  const now = Date.now();
  const shouldRefresh = now - lastRefreshTime > SESSION_REFRESH_INTERVAL;
  
  // If we have a cached session and it's fresh, return immediately
  if (cachedSession && !shouldRefresh) {
    return cachedSession;
  }
  
  // If there's already a fetch in progress, wait for it
  if (sessionPromise && !shouldRefresh) {
    return sessionPromise;
  }
  
  // Start a new session fetch
  sessionPromise = supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.warn('Failed to get session:', error.message);
      return null;
    }
    cachedSession = data.session;
    lastRefreshTime = Date.now();
    return cachedSession;
  });
  
  return sessionPromise;
}

/**
 * Get the access token from the cached session.
 * Falls back to the anon key if no session exists.
 */
export async function getAccessToken(): Promise<string> {
  const session = await getCachedSession();
  return session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

/**
 * Pre-warm the session cache on app load.
 * Call this once at app initialization to avoid waterfall on first API calls.
 */
export function preWarmSession(): void {
  getCachedSession().catch(() => {
    // Silently fail - session will be fetched on first use
  });
}

/**
 * Clear the session cache (call on logout)
 */
export function clearSessionCache(): void {
  cachedSession = null;
  sessionPromise = null;
  lastRefreshTime = 0;
}

/**
 * Update the cached session (call on auth state change)
 */
export function updateSessionCache(session: Session | null): void {
  cachedSession = session;
  lastRefreshTime = Date.now();
  sessionPromise = null;
}

// Listen for auth state changes to keep cache in sync
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    updateSessionCache(session);
  } else if (event === 'SIGNED_OUT') {
    clearSessionCache();
  }
});
