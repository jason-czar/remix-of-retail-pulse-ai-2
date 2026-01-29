# DeriveStreet Project Snapshot v3

**Generated:** 2026-01-28  
**Revision:** 3

---

## 1. PROJECT OVERVIEW

DeriveStreet is a market psychology intelligence platform that analyzes retail investor sentiment from StockTwits messages to generate structured decision-support intelligence for institutional use cases. The platform extracts narratives, emotions, and behavioral signals from social media messages, then synthesizes this data through AI-powered interpretation layers organized around 8 strategic "decision lenses" (Earnings, M&A, Capital Allocation, Leadership Change, Strategic Pivot, Product Launch, Activist Risk, Corporate Strategy). Users can track symbols via watchlists, view sentiment/narrative trends, understand narrative coherence scores, and access historical episode matching—all surfaced through a Liquid Glass UI design inspired by Apple's iOS 26 aesthetic.

### Primary Use Cases
- Corporate IR/Communications teams assessing retail sentiment before announcements
- Investment analysts evaluating market psychology around specific catalysts
- Strategists monitoring narrative persistence and coherence for timing decisions
- Researchers tracking historical narrative-to-price correlations

### Key Constraints & Guardrails
- **Descriptive, not predictive**: Historical outcome data is presented as descriptive intelligence, never as forecasts or price targets
- **Temporal governance**: Hourly data is de-weighted for strategic lenses; structural narratives (persistent across weekly/monthly) take priority
- **Data confidence transparency**: All analysis includes confidence scores with visible drivers (volume, author breadth, narrative coherence)
- **Non-goals**: No direct trading recommendations, no real-time alerts/execution, no predictive modeling

---

## 2. DATABASE SCHEMA

### 2.1 `psychology_snapshots`

**Purpose:** Primary table storing AI-analyzed market psychology snapshots at multiple temporal granularities (hourly, daily, weekly, monthly).

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| symbol | text | No | — |
| period_type | text | No | — |
| snapshot_start | timestamptz | No | — |
| snapshot_end | timestamptz | No | — |
| message_count | integer | No | 0 |
| unique_authors | integer | No | 0 |
| data_confidence | jsonb | No | {"score": 0, "drivers": {}} |
| observed_state | jsonb | No | {} |
| interpretation | jsonb | No | {} |
| interpretation_version | integer | No | 1 |
| historical_context | jsonb | Yes | — |
| narrative_outcomes | jsonb | Yes | [] |
| created_at | timestamptz | No | now() |

**Primary Key:** id

**Indexes:** 
- symbol, period_type, snapshot_start (upsert conflict target)

**RLS:** Public read, service_role write

#### `observed_state` Structure

```typescript
{
  narratives: NarrativeState[];    // Top 8 narratives with prevalence, velocity, sentiment
  emotions: EmotionState[];        // Top 10 emotions with intensity, polarity
  signals: {                       // Detected behavioral signals
    emotion_inflection: { active: boolean; strength?: number };
    narrative_shift: { active: boolean; strength?: number };
    consensus_breakdown: { active: boolean };
    capitulation_detected: { active: boolean };
    euphoria_risk: { active: boolean; strength?: number };
  };
  concentration: {
    top_10_users_pct: number;
    bull_bear_polarization: number;
    retail_consensus_strength: "weak" | "moderate" | "strong";
  };
  momentum: {
    overall_sentiment_velocity: number;
    dominant_narrative_velocity: number;
    dominant_emotion_velocity: number;
  };
  coherence?: NarrativeCoherence;  // Server-computed NCS (see below)
}
```

#### `observed_state.coherence` (Narrative Coherence Score - NCS)

```typescript
{
  score: number;                    // 0-100 composite coherence score
  entropy: number;                  // 0-1, lower = more concentrated
  emotion_convergence: number;      // 0-1, higher = aligned polarity
  velocity_stability: number;       // 0-1, higher = stable narratives
  dominant_narrative_share: number; // % of top narrative
  risk_level: "low" | "moderate" | "high";
  risk_drivers: string[];           // e.g., "Scattered narrative attention"
}
```

**NCS Formula:**
- Score = (1 - entropy) × 30 + emotion_convergence × 25 + velocity_stability × 25 + (dominant_share / 100) × 20

#### `interpretation` Structure

```typescript
{
  decision_overlays: Record<LensName, {
    risk_score: number;
    dominant_concerns: string[];
    recommended_focus: string[];
    recommended_actions: string[];
    confidence: number;
  }>;
  decision_readiness: Record<LensName, {
    readiness_score: number;
    blocking_narratives: string[];
    supportive_narratives: string[];
    recommended_timing: "proceed" | "delay" | "avoid";
    recommended_delay?: string;
    confidence: number;
  }>;
  snapshot_summary: {
    one_liner: string;
    primary_risk: string;
    dominant_emotion: string;
    action_bias: string;
    confidence: number;
  };
  temporal_attribution?: TemporalAttribution;
  narrative_persistence?: NarrativePersistence[];
}
```

#### `data_confidence` Structure

```typescript
{
  score: number;  // 0-1 composite
  drivers: {
    volume_percentile: number;      // 500+ messages = 1.0
    author_breadth: number;         // unique_authors / message_count
    narrative_coherence: number;    // optimal at 3-5 narratives
    temporal_stability: number;     // based on prior snapshot match
  }
}
```

---

### 2.2 `watchlists`

**Purpose:** User-defined symbol watchlists that drive scheduled data collection.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| name | text | No | — |
| symbols | text[] | No | {} |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**RLS:** Users can CRUD their own watchlists

---

### 2.3 `price_history`

**Purpose:** Daily OHLCV price data for tracked symbols, used to compute narrative impact outcomes.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| symbol | text | No | — |
| date | date | No | — |
| open | numeric | Yes | — |
| high | numeric | Yes | — |
| low | numeric | Yes | — |
| close | numeric | No | — |
| volume | bigint | Yes | — |
| source | text | Yes | "yahoo" |
| created_at | timestamptz | Yes | now() |

**Unique Constraint:** symbol, date

**RLS:** Public read only

---

### 2.4 `sentiment_history`

**Purpose:** Historical sentiment data with bullish/bearish counts.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| symbol | text | No | — |
| recorded_at | timestamptz | No | now() |
| sentiment_score | numeric | No | — |
| bullish_count | integer | No | 0 |
| bearish_count | integer | No | 0 |
| neutral_count | integer | No | 0 |
| message_volume | integer | No | 0 |
| dominant_emotion | text | Yes | — |
| dominant_narrative | text | Yes | — |
| created_at | timestamptz | No | now() |

**RLS:** Public read, service_role write

---

### 2.5 `narrative_history`

**Purpose:** Time-series narrative prevalence data.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| symbol | text | No | — |
| recorded_at | timestamptz | No | now() |
| period_type | text | No | — |
| narratives | jsonb | No | [] |
| dominant_narrative | text | Yes | — |
| message_count | integer | No | 0 |
| created_at | timestamptz | No | now() |

**RLS:** Public read, service_role write

---

### 2.6 `emotion_history`

**Purpose:** Time-series emotion intensity data.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| symbol | text | No | — |
| recorded_at | timestamptz | No | now() |
| period_type | text | No | — |
| emotions | jsonb | No | {} |
| dominant_emotion | text | Yes | — |
| message_count | integer | No | 0 |
| created_at | timestamptz | No | now() |

**RLS:** Public read, service_role write

---

### 2.7 `profiles`

**Purpose:** User profile data including subscription tier.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| email | text | No | — |
| full_name | text | Yes | — |
| company | text | Yes | — |
| subscription_plan | enum | No | "free" |
| api_calls_today | integer | No | 0 |
| api_calls_reset_at | timestamptz | No | now() |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**Enum:** subscription_plan = "free" | "professional" | "enterprise"

**RLS:** Users can view/update their own profile

---

### 2.8 `alerts`

**Purpose:** User-defined symbol alerts.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| symbol | text | No | — |
| alert_type | text | No | — |
| threshold | numeric | Yes | — |
| is_active | boolean | No | true |
| last_triggered_at | timestamptz | Yes | — |
| created_at | timestamptz | No | now() |

**RLS:** Users can CRUD their own alerts

---

### 2.9 `api_keys`

**Purpose:** User-generated API keys for programmatic access.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| key_hash | text | No | — |
| key_prefix | text | No | — |
| name | text | No | "Default Key" |
| is_active | boolean | No | true |
| last_used_at | timestamptz | Yes | — |
| created_at | timestamptz | No | now() |

**RLS:** Users can CRUD their own API keys

---

### 2.10 `user_custom_lenses`

**Purpose:** User-defined custom decision lenses.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| name | text | No | — |
| slug | text | No | — |
| decision_question | text | No | — |
| focus_areas | text[] | No | {} |
| exclusions | text[] | No | {} |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**RLS:** Users can CRUD their own custom lenses

---

### 2.11 Cache Tables

| Table | Purpose | TTL |
|-------|---------|-----|
| narrative_cache | Cached narrative analysis | 30 min |
| emotion_cache | Cached emotion analysis | 30 min |
| sentiment_cache | Cached sentiment data | 30 min |
| volume_cache | Cached volume data | 30 min |
| lens_summary_cache | Cached lens summaries | 2 hours |

---

### 2.12 Other Tables

- **volume_history**: Message volume time-series
- **market_psychology_history**: User-specific market psychology snapshots

---

## 3. EDGE FUNCTIONS / BACKEND LOGIC

### 3.1 `record-psychology-snapshot`

**Trigger:** HTTP POST (called by cron jobs and manual refresh)

**Inputs:**
- `periodType`: "hourly" | "daily" | "weekly" | "monthly" (default: "hourly")
- `forceRun`: boolean (bypasses trading hours check)

**Outputs:**
- Success: `{ success: true, periodType, processed, successful, results[] }`
- Error: `{ error: string }`

**High-Level Logic:**
1. Check if weekday and within trading hours (skip if not, unless forceRun)
2. Fetch all unique symbols from `watchlists` table
3. For each symbol:
   a. Fetch messages from StockTwits via `stocktwits-proxy`
   b. Fetch prior snapshot for comparison
   c. Extract narratives + emotions via AI (Gemini 3 Flash)
   d. Calculate concentration, signals, momentum
   e. **Calculate NCS (Narrative Coherence Score)** and store in `observed_state.coherence`
   f. Fetch multi-period snapshots for temporal governance
   g. Calculate narrative persistence (structural vs event-driven)
   h. Build temporal synthesis with lens-specific weights
   i. Generate interpretation layer via AI (decision overlays, readiness)
   j. Upsert to `psychology_snapshots`
4. Run `cleanup_psychology_snapshots()` to enforce retention

**External Services:**
- StockTwits API (via `stocktwits-proxy`)
- Lovable AI Gateway (Gemini 3 Flash)

**Environment Variables:**
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- STOCKTWITS_API_KEY, LOVABLE_API_KEY

---

### 3.2 `admin-backfill-psychology`

**Trigger:** HTTP POST (admin-only)

**Auth:** Requires `admin@czar.ing` email

**Actions:**

#### `backfill`
Creates historical psychology snapshots with SSE streaming progress.

**Inputs:**
- symbol, startDate, endDate
- computeNcs: boolean (default: true)
- skipInsufficientData: boolean (default: true)

**Logic:**
1. Generate list of weekdays in date range
2. For each date:
   - Skip if snapshot exists or weekend
   - Fetch historical messages from StockTwits
   - Skip if < 5 messages (if skipInsufficientData)
   - Extract psychology via AI
   - Calculate NCS if computeNcs=true
   - Insert snapshot with backdated created_at
3. Stream progress via SSE (start, progress, created, skipped, error, complete)

#### `recompute_ncs`
Recalculates NCS on existing snapshots.

**Inputs:**
- symbol, startDate, endDate
- dryRun: boolean (default: true)

**Logic:**
1. Fetch snapshots in date range
2. For each: recalculate coherence from observed_state
3. Update observed_state.coherence

---

### 3.3 `stocktwits-proxy`

**Trigger:** HTTP GET/POST

**Purpose:** Proxies requests to StockTwits API with authentication.

**Inputs:**
- action: "messages" | "trending" | "stats"
- symbol: string
- limit: number (max 1000 per page for messages)
- start/end: date strings (for historical)

**External Services:** StockTwits API

**Environment:** STOCKTWITS_API_KEY

---

### 3.4 `analyze-narratives`

**Trigger:** HTTP POST

**Purpose:** AI-powered narrative extraction from messages.

**Inputs:** symbol, timeRange, skipCache

**Logic:**
1. Check cache, return if valid
2. Aggregate snapshots from narrative_history if available
3. Otherwise call AI to extract narratives
4. Cache results

---

### 3.5 `analyze-emotions`

**Trigger:** HTTP POST

**Purpose:** AI-powered emotion extraction from messages.

Similar to analyze-narratives but for emotions.

---

### 3.6 `generate-lens-summary`

**Trigger:** HTTP POST

**Purpose:** Generates AI summary for a specific decision lens.

**Inputs:**
- symbol, lens (or customLens object)

**Logic:**
1. Check cache
2. Fetch latest psychology snapshot
3. Generate lens-specific summary via AI
4. For custom lenses: extract keyConcerns and recommendedActions
5. Cache and return

---

### 3.7 `collect-daily-prices`

**Trigger:** Cron (4:30 PM ET weekdays)

**Purpose:** Fetches daily OHLCV from Yahoo Finance.

**Logic:**
1. Get all symbols from watchlists
2. For each: fetch today's price from Yahoo Finance
3. Upsert to price_history

---

### 3.8 `compute-narrative-outcomes`

**Trigger:** Cron (5:00 PM ET weekdays)

**Purpose:** Calculates historical price moves following narratives.

**Logic:**
1. Get symbols with recent snapshots
2. For each narrative: find historical episodes where it was dominant
3. Calculate average 5D/10D price moves
4. Store in psychology_snapshots.narrative_outcomes

---

### 3.9 `ask-derive-street`

**Trigger:** HTTP POST

**Purpose:** Conversational AI assistant for intelligence queries.

**Inputs:** messages[], symbol, intelligenceContext

**Logic:**
1. Build context from recent psychology snapshot
2. Stream AI response with conversation history
3. Support markdown formatting

---

### 3.10 `backfill-price-history`

**Trigger:** HTTP POST (admin)

**Purpose:** Backfills 365 days of price data from Yahoo Finance.

---

### 3.11 `record-narrative-emotion-snapshot`

**Trigger:** Cron (hourly)

**Purpose:** Records narrative/emotion history for watchlist symbols.

---

### 3.12 `record-sentiment-snapshot`

**Trigger:** Cron (hourly during market hours)

**Purpose:** Records sentiment history including volume.

---

### 3.13 `auto-backfill-gaps`

**Trigger:** HTTP POST

**Purpose:** Automatically fills gaps in narrative/emotion history.

---

### 3.14 `cleanup-narrative-data`

**Trigger:** HTTP POST (admin)

**Purpose:** Removes duplicate entries from narrative data tables.

---

## 4. CRON JOBS / SCHEDULED TASKS

| Name | Schedule | Function | Reads From | Writes To | Safeguards |
|------|----------|----------|------------|-----------|------------|
| psychology-snapshot-hourly | :30 14-21 * * 1-5 (market hours) | record-psychology-snapshot | watchlists, StockTwits | psychology_snapshots | Skips weekends, off-hours |
| psychology-snapshot-daily | 0 21 * * 1-5 (4 PM ET) | record-psychology-snapshot | Same | Same | periodType=daily |
| psychology-snapshot-weekly | 0 22 * * 5 (Fri 5 PM ET) | record-psychology-snapshot | Same | Same | periodType=weekly |
| psychology-snapshot-monthly | 0 22 1 * * (1st of month) | record-psychology-snapshot | Same | Same | periodType=monthly |
| collect-daily-prices | 30 21 * * 1-5 (4:30 PM ET) | collect-daily-prices | watchlists, Yahoo | price_history | Upsert on conflict |
| compute-narrative-outcomes | 0 22 * * 1-5 (5 PM ET) | compute-narrative-outcomes | psychology_snapshots, price_history | narrative_outcomes | Min 5 episodes |
| record-narrative-emotion-hourly | 30 * * * * | record-narrative-emotion-snapshot | watchlists, StockTwits | narrative_history, emotion_history | forceRun=true |
| record-sentiment-snapshot-hourly | 30 13-21 * * 1-5 | record-sentiment-snapshot | watchlists, StockTwits | sentiment_history, volume_history | Weekdays only |
| cleanup-old-history | 0 0 * * * (midnight UTC) | cleanup_old_history() | — | DELETE old history | 90 days retention |
| psychology-snapshot-cleanup | 0 3 * * * | cleanup_psychology_snapshots() | — | DELETE old snapshots | Tiered retention |

**Retention Policy:**
- Hourly snapshots: 30 days
- Daily snapshots: 90 days
- Weekly snapshots: 1 year
- Monthly snapshots: 3 years

---

## 5. API SURFACE

### 5.1 Edge Function Endpoints

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| /functions/v1/stocktwits-proxy | GET/POST | Proxy StockTwits API | API key |
| /functions/v1/analyze-narratives | POST | Extract narratives | None |
| /functions/v1/analyze-emotions | POST | Extract emotions | None |
| /functions/v1/record-psychology-snapshot | POST | Record snapshots | None |
| /functions/v1/generate-lens-summary | POST | Generate lens summary | None |
| /functions/v1/ask-derive-street | POST | AI chat assistant | None |
| /functions/v1/get-sentiment-history | POST | Get sentiment data | None |
| /functions/v1/collect-daily-prices | POST | Fetch daily prices | None |
| /functions/v1/compute-narrative-outcomes | POST | Compute outcomes | None |
| /functions/v1/admin-backfill-psychology | POST | Admin backfill | Admin email |

### 5.2 Direct Database Access

All database access is via Supabase client with RLS policies enforcing access control.

---

## 6. FRONTEND / UI STRUCTURE

### 6.1 Routes

| Route | Component | Auth Required | Layout |
|-------|-----------|---------------|--------|
| / | Index | No | Standalone |
| /login | LoginPage | No | Standalone |
| /signup | SignupPage | No | Standalone |
| /onboarding | OnboardingPage | No | Standalone |
| /learn-more | LearnMorePage | No | Standalone |
| /pricing | PricingPage | No | Standalone |
| /dashboard | Dashboard | Yes | AppLayout |
| /trending | TrendingPage | Yes | AppLayout |
| /symbol/:symbol | SymbolPage | Yes* | AppLayout |
| /symbol/:symbol/messages | MessagesPage | Yes* | AppLayout |
| /settings | SettingsPage | Yes | AppLayout |
| /alerts | AlertsPage | Yes | AppLayout |
| /analytics | AnalyticsPage | Yes | AppLayout |
| /api-docs | ApiDocsPage | No | AppLayout |

*AAPL and NVDA are publicly accessible demo symbols

### 6.2 SymbolPage Components

The Symbol page (`/symbol/:symbol`) is the primary analysis view:

- **DecisionLensSelector**: 8 institutional lenses + Summary + Custom lenses
- **DecisionQuestionHeader**: Shows lens-specific question and AI summary
- **SummaryInsightsCard**: Unified summary with confidence metrics
- **LensReadinessCard**: Readiness score, blocking/supportive narratives
- **CustomLensReadinessCard**: For user-defined lenses with keyConcerns/actions
- **PsychologyOverviewCard**: Signals, concentration, momentum
- **NarrativeCoherenceCard**: NCS display with components (Focus, Alignment, Stability)
- **NCSTrendChart**: 7D/30D/90D NCS trend visualization
- **HistoricalEpisodeMatcher**: Finds similar past episodes
- **NarrativeImpactHistorySection**: Historical price moves following narratives
- **Chart tabs**: NarrativeChart, EmotionChart, SentimentChart, EmotionMomentumChart
- **TimeRangeSelector**: 1H, 6H, Today, 24H, 7D, 30D
- **MessagesSidebar**: Real-time message feed
- **AskDeriveStreetBar/Panel**: AI chat assistant

### 6.3 Key Component Dependencies

| Component | Data Source |
|-----------|-------------|
| NarrativeCoherenceCard | usePsychologySnapshot → psychology_snapshots.observed_state.coherence |
| NCSTrendChart | useNCSHistory → psychology_snapshots (historical) |
| LensReadinessCard | usePsychologySnapshot → interpretation.decision_readiness |
| SummaryInsightsCard | useDecisionLensSummary → generate-lens-summary edge function |
| NarrativeChart | useNarrativeHistory → narrative_history |
| SentimentChart | useSentimentHistory → sentiment_history |

### 6.4 Settings Page - Admin Data Controls

Located at `/settings?tab=data`, the **AdminDataControls** component (visible only to `admin@czar.ing`) provides:

1. **Snapshot Backfill**: Create historical daily snapshots with date range picker
   - Symbol, start date, end date inputs
   - Options: Compute NCS, Skip insufficient data
   - Preview shows weekday count
   - SSE streaming progress with event log

2. **Recompute NCS**: Recalculate coherence on existing snapshots
   - Dry run mode supported
   - Shows snapshots found and would-update count

3. **Refresh Psychology Snapshot**: Force immediate hourly snapshot for a symbol

---

## 7. DATA FLOW SUMMARY

### 7.1 Data Entry

1. **StockTwits Messages**: Fetched via stocktwits-proxy from StockTwits API
2. **Price Data**: Fetched via collect-daily-prices from Yahoo Finance

### 7.2 Processing Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ StockTwits API  │────▶│ stocktwits-proxy │────▶│ Raw Messages    │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  record-psychology-snapshot                      │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────────┐   │
│  │ AI Extraction│─▶│ Signal Detect │─▶│ NCS Calculation    │   │
│  │ (narratives, │  │ (inflections, │  │ (entropy, velocity,│   │
│  │  emotions)   │  │  shifts, etc) │  │  convergence)      │   │
│  └──────────────┘  └───────────────┘  └────────────────────┘   │
│           │                                      │              │
│           ▼                                      ▼              │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Temporal Governance                        │    │
│  │  • Multi-period snapshot synthesis                      │    │
│  │  • Lens-specific weighting (hourly de-weighted)         │    │
│  │  • Narrative persistence classification                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           AI Interpretation Layer                       │    │
│  │  • Decision overlays (8 lenses)                         │    │
│  │  • Readiness scores                                     │    │
│  │  • Snapshot summary                                     │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                   ┌────────────────────┐
                   │ psychology_snapshots│
                   │ (observed_state,   │
                   │  interpretation)   │
                   └────────────────────┘
```

### 7.3 Storage

- **psychology_snapshots**: Primary intelligence store
- **narrative_history / emotion_history**: Time-series for charts
- **price_history**: OHLCV for outcome calculations
- **Cache tables**: Short-lived analysis caches

### 7.4 Surfacing to Users

1. **Symbol Page**: Queries psychology_snapshots, displays via cards/charts
2. **AI Summaries**: generate-lens-summary creates contextual summaries
3. **Ask Panel**: ask-derive-street provides conversational access
4. **API**: External access via x-api-key authentication

---

## 8. KNOWN LIMITATIONS / OPEN QUESTIONS

### Technical Debt
1. **Fallback interpretation**: When AI generation fails, a rule-based fallback generates basic interpretation (less nuanced)
2. **Client-side NCS fallback**: Legacy snapshots without server NCS use client-side calculation (marked "Estimated")
3. **StockTwits API limits**: Historical message access may be limited for older dates

### Tradeoffs Made
1. **Temporal governance complexity**: Lens-specific weighting adds complexity but prevents recency bias
2. **AI retry logic**: 3 retries with exponential backoff balances reliability vs latency
3. **Public demo symbols**: AAPL/NVDA accessible without auth for demos

### Areas Intentionally Deferred
1. **Real-time alerts**: System is batch-oriented, not real-time
2. **Predictive modeling**: Explicitly out of scope (descriptive only)
3. **Multi-language support**: English only currently
4. **Mobile native app**: Web-only (responsive)

---

## RECENTLY IMPLEMENTED FEATURES VERIFIED

### ✅ Narrative Coherence Score (NCS) stored at `psychology_snapshots.observed_state.coherence`

**Files/Functions:**
- `supabase/functions/record-psychology-snapshot/index.ts` (lines 135-224): `calculateNarrativeCoherence()` function
- `supabase/functions/record-psychology-snapshot/index.ts` (line 1704): Coherence calculated and stored in observedState
- `supabase/functions/admin-backfill-psychology/index.ts` (lines 128-194): Same calculation for backfill

---

### ✅ NarrativeCoherenceCard prefers server NCS with fallback + "Estimated" indicator

**Files:**
- `src/components/NarrativeCoherenceCard.tsx` (lines 70-137): `computeCoherenceFromState()` client-side fallback
- `src/components/NarrativeCoherenceCard.tsx` (lines 166-171): Server preference with fallback logic
- `src/components/NarrativeCoherenceCard.tsx` (lines 183-196): "Estimated" badge display when client-computed

---

### ✅ NCSTrendChart with 7D/30D/90D toggles and "Insufficient history (x of 7)" rule

**Files:**
- `src/components/NCSTrendChart.tsx` (lines 32-36): `MIN_SNAPSHOTS` constant (4 for 7D, 7 for 30D/90D)
- `src/components/NCSTrendChart.tsx` (lines 38-42): `RANGE_OPTIONS` array
- `src/components/NCSTrendChart.tsx` (lines 272-278): Insufficient data display with count

---

### ✅ Unified ConfidenceBadge (High/Moderate/Experimental) and where it's used

**Files:**
- `src/components/ui/ConfidenceBadge.tsx` (lines 6, 26-76): Type definitions and config
- `src/components/ui/ConfidenceBadge.tsx` (lines 78-91): `getConfidenceLevel()` function
- `src/components/ui/ConfidenceBadge.tsx` (lines 93-137): `ConfidenceBadge` component

**Usage locations:**
- `src/components/NarrativeCoherenceCard.tsx` (line 203): In coherence card
- `src/components/NCSTrendChart.tsx` (line 64): In trend chart tooltip
- `src/components/LensReadinessCard.tsx`: In readiness cards
- `src/components/CustomLensReadinessCard.tsx`: In custom lens cards
- `src/components/DecisionQuestionHeader.tsx`: In decision headers
- `src/components/SummaryInsightsCard.tsx`: In summary cards
- `src/components/HistoricalEpisodeMatcher.tsx`: In episode matching

---

### ✅ Admin Data Controls panel (backfill / recompute) and the backend endpoints

**Files:**
- `src/components/AdminDataControls.tsx` (lines 176-211): Admin check and component structure
- `src/components/AdminDataControls.tsx` (lines 215-380): `handleBackfill()` with SSE streaming
- `src/components/AdminDataControls.tsx` (lines 388-435): `handleRecompute()` for NCS recalculation
- `src/components/AdminDataControls.tsx` (lines 101-173): `RefreshPsychologySnapshot` sub-component

**Backend endpoints called:**
- `supabase/functions/admin-backfill-psychology/index.ts`: Action "backfill" (lines 654-927) and "recompute_ncs" (lines 575-651)
- `supabase/functions/record-psychology-snapshot/index.ts`: For manual refresh (via forceRun=true)

**Settings integration:**
- `src/pages/SettingsPage.tsx` (lines 469-473): AdminDataControls rendered in Data tab
