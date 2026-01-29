/**
 * Circuit Breaker Module for Edge Functions
 * 
 * Protects against cascading failures when upstream APIs (StockTwits, Yahoo Finance) are unavailable.
 * Uses in-memory state that resets on function cold start - acceptable for edge functions
 * as each instance handles burst traffic independently.
 */

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  lastSuccess: number;
  halfOpenSuccesses: number;
}

// In-memory circuit state (per function instance)
const circuits: Map<string, CircuitState> = new Map();

// Configuration
const CONFIG = {
  failureThreshold: 5,        // Open after 5 consecutive failures
  resetTimeout: 30000,        // 30 seconds before transitioning to half-open
  halfOpenSuccessThreshold: 2, // Successes needed in half-open to close
};

function createInitialState(): CircuitState {
  return {
    failures: 0,
    lastFailure: 0,
    state: 'closed',
    lastSuccess: Date.now(),
    halfOpenSuccesses: 0,
  };
}

/**
 * Check if a request can be made through the circuit
 * Returns false if circuit is open (blocking requests)
 */
export function canMakeRequest(circuitId: string): boolean {
  const state = circuits.get(circuitId);
  if (!state) return true; // No circuit state = allow request
  
  if (state.state === 'closed') return true;
  
  if (state.state === 'open') {
    // Check if cooldown period has elapsed
    const elapsed = Date.now() - state.lastFailure;
    if (elapsed > CONFIG.resetTimeout) {
      // Transition to half-open
      state.state = 'half-open';
      state.halfOpenSuccesses = 0;
      console.log(`Circuit ${circuitId} transitioned to HALF-OPEN after ${elapsed}ms cooldown`);
      return true;
    }
    // Still in cooldown - block request
    return false;
  }
  
  // Half-open: allow limited requests for testing
  return true;
}

/**
 * Record a successful request - may close the circuit
 */
export function recordSuccess(circuitId: string): void {
  const state = circuits.get(circuitId) || createInitialState();
  
  if (state.state === 'half-open') {
    state.halfOpenSuccesses++;
    if (state.halfOpenSuccesses >= CONFIG.halfOpenSuccessThreshold) {
      state.state = 'closed';
      state.failures = 0;
      console.log(`Circuit ${circuitId} CLOSED after ${state.halfOpenSuccesses} successful requests`);
    }
  } else {
    // Reset failures on success in closed state
    state.failures = 0;
  }
  
  state.lastSuccess = Date.now();
  circuits.set(circuitId, state);
}

/**
 * Record a failed request - may open the circuit
 */
export function recordFailure(circuitId: string): void {
  const state = circuits.get(circuitId) || createInitialState();
  state.failures++;
  state.lastFailure = Date.now();
  
  if (state.state === 'half-open') {
    // Failure in half-open = immediately reopen
    state.state = 'open';
    console.warn(`Circuit ${circuitId} re-OPENED after failure in half-open state`);
  } else if (state.failures >= CONFIG.failureThreshold) {
    state.state = 'open';
    console.warn(`Circuit ${circuitId} OPENED after ${state.failures} consecutive failures`);
  }
  
  circuits.set(circuitId, state);
}

/**
 * Get current circuit state for debugging/headers
 */
export function getCircuitState(circuitId: string): CircuitState | null {
  return circuits.get(circuitId) || null;
}

/**
 * Get circuit state label for response headers
 */
export function getCircuitStateLabel(circuitId: string): 'CLOSED' | 'OPEN' | 'HALF-OPEN' {
  const state = circuits.get(circuitId);
  if (!state) return 'CLOSED';
  return state.state.toUpperCase() as 'CLOSED' | 'OPEN' | 'HALF-OPEN';
}

/**
 * Check if a response indicates a failure that should trip the circuit
 */
export function isCircuitTripError(status: number, isNonJsonResponse: boolean = false): boolean {
  // Trip on: rate limits (429), server errors (5xx), non-JSON responses (HTML error pages)
  return status === 429 || status >= 500 || isNonJsonResponse;
}
