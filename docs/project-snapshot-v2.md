# Derive Street — Project Snapshot v2

**Generated:** 2026-01-20  
**Type:** READ-ONLY documentation for external analysis  
**Scope:** Complete technical overview of current system state

---

## 1. PROJECT OVERVIEW

Derive Street is a market psychology analytics platform that extracts, quantifies, and visualizes retail investor sentiment from StockTwits social data. The system aggregates messages for tracked stock symbols, uses AI (via the Lovable API) to extract structured narrative themes and emotions, and presents this data through a multi-lens decision-readiness framework. The platform is explicitly **descriptive** (documenting what retail participants are saying) rather than **predictive** (making forward-looking claims).

### Primary Use Cases

1. **Narrative Tracking** — Identify dominant market themes (e.g., "Earnings Momentum", "Activist Risk") and their prevalence over time
2. **Emotion Analysis** — Measure aggregate emotional states (Fear, Greed, Optimism, Uncertainty) with polarity classification
3. **Decision Readiness Assessment** — Evaluate psychological conditions through 8 institutional lenses (M&A, Earnings, Investor Relations, etc.)
4. **Historical Pattern Matching** — Find similar past psychological episodes and their subsequent price outcomes
5. **Narrative Impact Analysis** — Compute historical price moves following narrative dominance events

### Key Constraints / Guardrails

- **Descriptive only**: All language describes observed sentiment, not predictions
- **Confidence tiering**: Experimental (<5 episodes), Moderate (5-9), High (10+)
- **Minimum data thresholds**: 7 snapshots required for NCS trend charts; 3+ messages for valid snapshots
- **Weekend/off-hours guards**: Scheduled jobs skip non-trading periods unless `forceRun=true`
- **Admin-only controls**: Backfill and recompute functions restricted to `admin@czar.ing`

---

## 2. DATABASE SCHEMA

### Table: `psychology_snapshots`

**Purpose:** Core table storing AI-analyzed market psychology data across multiple timeframes.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | Primary key |
| symbol | text | No | — | Stock ticker (uppercase) |
| period_type | text | No | — | 'hourly' \| 'daily' \| 'weekly' \| 'monthly' |
| snapshot_start | timestamptz | No | — | Period start time |
| snapshot_end | timestamptz | No | — | Period end time |
| message_count | integer | No | 0 | Messages analyzed |
| unique_authors | integer | No | 0 | Distinct message authors |
| observed_state | jsonb | No | '{}' | Core psychology data (see below) |
| interpretation | jsonb | No | '{}' | 8-lens decision readiness |
| data_confidence | jsonb | No | '{"score":0,"drivers":{}}' | Confidence metrics |
| historical_context | jsonb | Yes | NULL | Similar period matches |
| narrative_outcomes | jsonb | Yes | '[]' | Historical price outcomes |
| interpretation_version | integer | No | 1 | Schema version |
| created_at | timestamptz | No | now() | Record creation time |

**Unique Constraint:** (symbol, period_type, snapshot_start)

**RLS:** Public read; service_role write only

#### `observed_state` JSONB Structure

```typescript
{
  narratives: [{
    id: string,              // Normalized snake_case ID
    label: string,           // Human-readable label
    prevalence_pct: number,  // 0-100
    change_vs_prior: number, // Percentage change
    velocity: { direction: 'accelerating'|'decelerating'|'stable', magnitude: number },
    sentiment_skew: number,  // -1 (bearish) to +1 (bullish)
    dominant_emotions: string[],
    co_occurring_narratives: string[],
    confidence: number
  }],
  emotions: [{
    emotion: string,
    intensity: number,       // 0-100
    change_vs_prior: number,
    volatility: 'low'|'moderate'|'high',
    velocity: { direction, magnitude },
    polarity: 'bullish'|'bearish'|'neutral',
    confidence: number
  }],
  signals: {
    emotion_inflection: { active: boolean, strength?: number },
    narrative_shift: { active: boolean, strength?: number },
    consensus_breakdown: { active: boolean },
    capitulation_detected: { active: boolean },
    euphoria_risk: { active: boolean }
  },
  concentration: {
    top_10_users_pct: number,
    bull_bear_polarization: number,
    retail_consensus_strength: 'weak'|'moderate'|'strong'
  },
  momentum: {
    overall_sentiment_velocity: number,
    dominant_narrative_velocity: number,
    dominant_emotion_velocity: number
  },
  coherence: {  // <-- NCS: Server-computed Narrative Coherence Score
    score: number,              // 0-100 composite
    entropy: number,            // 0-1 (normalized Shannon entropy)
    emotion_convergence: number,// 0-1
    velocity_stability: number, // 0-1
    dominant_narrative_share: number,
    risk_level: 'low'|'moderate'|'high',
    risk_drivers: string[]
  }
}
```

---

### Table: `price_history`

**Purpose:** Daily OHLCV price data for narrative outcome calculations.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| symbol | text | No | — |
| date | date | No | — |
| open | numeric | Yes | — |
| high | numeric | Yes | — |
| low | numeric | Yes | — |
| close | numeric | No | — |
| volume | bigint | Yes | — |
| source | text | Yes | 'yahoo' |
| created_at | timestamptz | Yes | now() |

**Unique Constraint:** (symbol, date)

**RLS:** Public read only

---

### Table: `watchlists`

**Purpose:** User-defined stock watchlists driving scheduled data collection.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | — |
| name | text | No | — |
| symbols | text[] | No | '{}' |
| created_at | timestamptz | No | now() |
| updated_at | timestamptz | No | now() |

**RLS:** User can CRUD own watchlists only (auth.uid() = user_id)

---

### Table: `sentiment_history`

**Purpose:** Hourly sentiment score snapshots with bull/bear/neutral counts.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
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

---

### Table: `narrative_history` / `emotion_history`

**Purpose:** Historical snapshots of AI-extracted narratives and emotions (separate from psychology_snapshots for legacy compatibility).

| Column | Type | Notes |
|--------|------|-------|
| symbol | text | Stock ticker |
| period_type | text | 'hourly' \| 'daily' |
| recorded_at | timestamptz | Snapshot time |
| narratives/emotions | jsonb | Array of extracted items |
| dominant_narrative/dominant_emotion | text | Top item |
| message_count | integer | Messages analyzed |

---

### Table: `volume_history` / `volume_cache`

**Purpose:** Message volume tracking with hourly distribution data.

---

### Table: `alerts`

**Purpose:** User-configured price/sentiment alerts.

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid | Owner |
| symbol | text | Target stock |
| alert_type | text | Alert trigger type |
| threshold | numeric | Trigger threshold |
| is_active | boolean | Default true |
| last_triggered_at | timestamptz | Last fire time |

**RLS:** User CRUD on own alerts only

---

### Table: `profiles`

**Purpose:** User profile data and subscription status.

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid | References auth.users |
| email | text | User email |
| full_name | text | Display name |
| company | text | Company affiliation |
| subscription_plan | enum | 'free' \| 'professional' \| 'enterprise' |
| api_calls_today | integer | Rate limiting counter |
| api_calls_reset_at | timestamptz | Counter reset time |

---

### Table: `api_keys`

**Purpose:** User-generated API keys for external access.

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid | Owner |
| name | text | Key label |
| key_prefix | text | First 8 chars (for display) |
| key_hash | text | SHA-256 hash |
| is_active | boolean | Enable/disable |
| last_used_at | timestamptz | Usage tracking |

---

### Table: `lens_summary_cache`

**Purpose:** Cached AI-generated summaries for decision lenses.

---

## 3. EDGE FUNCTIONS / BACKEND LOGIC

### `record-psychology-snapshot`

**Trigger:** Cron scheduled (hourly, daily, weekly, monthly) + manual invocation

**Inputs:**
- `periodType`: 'hourly' | 'daily' | 'weekly' | 'monthly'
- `forceRun`: boolean (bypass weekend/off-hours guards)
- `symbol`: optional single symbol override

**Outputs:**
- JSON with processed symbols count, results, errors

**High-Level Logic:**
1. Check if within trading hours (weekdays 9:30 AM - 4 PM ET) unless `forceRun`
2. Fetch symbols from all user watchlists
3. For each symbol:
   - Fetch messages from StockTwits via `stocktwits-proxy`
   - Retrieve prior snapshot for velocity calculations
   - Call Lovable AI API to extract narratives and emotions
   - **Calculate NCS (Narrative Coherence Score)** server-side:
     - Shannon entropy of narrative prevalence distribution
     - Emotion convergence (bull/bear alignment)
     - Velocity stability (inverse of average velocity magnitude)
     - Dominant narrative share
     - Composite score (0-100) with risk level classification
   - Build temporal synthesis (weighted across hourly/daily/weekly/monthly)
   - Generate interpretation layer (8 decision lenses) via AI
   - Insert snapshot into `psychology_snapshots` table
4. Run cleanup function for expired snapshots

**External Services:**
- StockTwits API (via proxy)
- Lovable AI API (gemini-2.5-flash)

**Environment Variables:**
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `STOCKTWITS_API_KEY`, `LOVABLE_API_KEY`

---

### `admin-backfill-psychology`

**Trigger:** HTTP POST (admin-only)

**Inputs:**
- `action`: 'backfill' | 'recompute_ncs'
- `symbol`: target stock
- `startDate`, `endDate`: date range
- `computeNcs`: boolean (for backfill)
- `skipInsufficientData`: boolean
- `dryRun`: boolean (for recompute)

**Outputs:**
- SSE stream for 'backfill' with real-time progress events
- JSON result for 'recompute_ncs'

**High-Level Logic:**
- **Backfill action:**
  1. Validate admin user (email = admin@czar.ing)
  2. Iterate through each weekday in date range
  3. Skip weekends
  4. Fetch historical messages from StockTwits for that date
  5. Call AI to extract narratives/emotions
  6. Calculate all metrics including NCS
  7. Insert new snapshot (skip if exists)
  8. Stream progress events via SSE

- **Recompute NCS action:**
  1. Fetch existing snapshots in date range
  2. Recalculate NCS from observed_state data
  3. Update snapshots (or report would-update counts if dryRun)

---

### `compute-narrative-outcomes`

**Trigger:** Cron (weekdays 5 PM ET)

**Inputs:**
- Optional `symbol` or `symbols` array

**Outputs:**
- JSON with processed symbols and outcome counts

**High-Level Logic:**
1. Get symbols from watchlists (or from request body)
2. For each symbol:
   - Fetch 180 days of psychology snapshots
   - Fetch price history
   - Identify current top 8 narratives
   - Detect "episodes" (periods where narrative ≥25% prevalence)
   - Calculate forward returns (5D, 10D) from episode anchor dates
   - Compute statistics (median, p25/p75, win rates, max drawdown)
   - Apply recency weighting (45-day half-life)
   - Determine confidence level
3. Update `narrative_outcomes` JSONB in latest snapshot

---

### `collect-daily-prices`

**Trigger:** Cron (weekdays 4:30 PM ET)

**Purpose:** Fetch and store daily OHLCV data from Yahoo Finance for watchlist symbols.

---

### `backfill-price-history`

**Trigger:** Manual HTTP POST

**Purpose:** Seed historical price data (365 days) for new symbols.

---

### `stocktwits-proxy`

**Trigger:** HTTP (from frontend and other edge functions)

**Purpose:** Proxy StockTwits API calls with API key authentication.

---

### `generate-lens-summary`

**Trigger:** HTTP (from frontend)

**Purpose:** Generate AI summaries for specific decision lenses with caching.

---

### `auto-backfill-gaps`

**Trigger:** Manual or via FillGapsDialog

**Purpose:** Identify and fill missing weekday snapshots in narrative/emotion history.

---

### `analyze-narratives` / `analyze-emotions`

**Trigger:** HTTP (legacy endpoints)

**Purpose:** Real-time narrative/emotion analysis for individual requests.

---

## 4. CRON JOBS / SCHEDULED TASKS

| Name | Schedule | Function Triggered | Reads From | Writes To |
|------|----------|-------------------|------------|-----------|
| record-psychology-snapshot-hourly | :30 past each hour (market hours) | record-psychology-snapshot | watchlists, StockTwits | psychology_snapshots |
| record-psychology-snapshot-daily | 4 PM ET weekdays | record-psychology-snapshot | watchlists, StockTwits | psychology_snapshots |
| record-psychology-snapshot-weekly | Fridays 5 PM ET | record-psychology-snapshot | watchlists, StockTwits | psychology_snapshots |
| record-psychology-snapshot-monthly | 1st of month 5 PM ET | record-psychology-snapshot | watchlists, StockTwits | psychology_snapshots |
| collect-daily-prices | Weekdays 4:30 PM ET (21:30 UTC) | collect-daily-prices | Yahoo Finance | price_history |
| compute-narrative-outcomes | Weekdays 5 PM ET (22:00 UTC) | compute-narrative-outcomes | psychology_snapshots, price_history | psychology_snapshots.narrative_outcomes |
| cleanup_psychology_snapshots | Daily | SQL function | psychology_snapshots | psychology_snapshots (DELETE) |

**Retention Policy (cleanup_psychology_snapshots):**
- Hourly: 30 days
- Daily: 90 days
- Weekly: 1 year
- Monthly: 3 years

**Idempotency:**
- Snapshots have unique constraint on (symbol, period_type, snapshot_start)
- Backfill checks for existing records before inserting
- Price history uses UPSERT on (symbol, date)

---

## 5. API SURFACE

### Edge Function Endpoints

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| /functions/v1/stocktwits-proxy | GET/POST | Fetch StockTwits messages | Public (verify_jwt=false) |
| /functions/v1/record-psychology-snapshot | POST | Trigger psychology snapshot | Public |
| /functions/v1/admin-backfill-psychology | POST | Admin backfill/recompute | Admin only (email check) |
| /functions/v1/compute-narrative-outcomes | POST | Compute narrative price outcomes | Public |
| /functions/v1/collect-daily-prices | POST | Fetch daily price data | Public |
| /functions/v1/generate-lens-summary | POST | Generate decision lens summary | Public |
| /functions/v1/analyze-narratives | POST | Real-time narrative analysis | Public |
| /functions/v1/analyze-emotions | POST | Real-time emotion analysis | Public |
| /functions/v1/stock-price-proxy | GET | Proxy stock price API | Public |
| /functions/v1/auto-backfill-gaps | POST | Fill missing data gaps | Public |
| /functions/v1/backfill-price-history | POST | Seed price history | Public |
| /functions/v1/backfill-volume-history | POST | Seed volume history | Public |

---

## 6. FRONTEND / UI STRUCTURE

### Routes

| Path | Component | Auth Required | Description |
|------|-----------|---------------|-------------|
| / | Index | No | Landing page |
| /login | LoginPage | No | Authentication |
| /signup | SignupPage | No | Registration |
| /onboarding | OnboardingPage | No | New user flow |
| /dashboard | Dashboard | Yes | Main app dashboard |
| /symbol/:symbol | SymbolPage | Yes* | Symbol detail view |
| /symbol/:symbol/messages | MessagesPage | Yes* | Message feed |
| /trending | TrendingPage | Yes | Trending symbols |
| /settings | SettingsPage | Yes | User settings |
| /alerts | AlertsPage | Yes | Alert management |
| /api-docs | ApiDocsPage | No | API documentation |
| /learn-more | LearnMorePage | No | Feature explanation |
| /pricing | PricingPage | No | Pricing tiers with comparison table |

*AAPL and NVDA are publicly accessible for demo purposes.

### SymbolPage Key Components

- **Header** — Navigation with search
- **DecisionLensSelector** — Toggle between 8 decision lenses
- **AI Summary Card** — Lens-specific summary from `generate-lens-summary`
- **Chart Tabs:**
  - NarrativeChart — Narrative prevalence over time
  - EmotionChart — Emotion intensity breakdown
  - SentimentChart — Bull/bear/neutral ratio
  - VolumeChart — Message volume trends
  - EmotionMomentumChart — Velocity tracking
- **DecisionReadinessDashboard** — 8-lens readiness scores with overlays
- **NarrativeCoherenceCard** — NCS display with server/client fallback
- **NCSTrendChart** — 7D/30D/90D NCS trend with interpretation labels
- **HistoricalEpisodeMatcher** — Similar past episodes with outcomes
- **NarrativeImpactHistorySection** — Narrative-specific price outcomes

### SettingsPage Tabs

- **Profile** — Name, email, company
- **API Keys** — Generate/manage API keys
- **Alerts** — Alert configuration (AlertsManager)
- **Data** — AdminDataControls (admin only), ManualSnapshotTrigger, HistoryBackfillUploader
- **Appearance** — ThemeSwitcher (light/dark)
- **Subscription** — Plan status and usage

### Confidence Badge Usage (ConfidenceBadge Component)

Used in:
- `NarrativeCoherenceCard` — Data confidence level
- `NCSTrendChart` — Tooltip confidence display
- `HistoricalEpisodeMatcher` — Episode similarity confidence
- `NarrativeImpactHistorySection` — Outcome confidence tiers
- `DecisionReadinessDashboard` — Lens confidence indicators

---

## 7. DATA FLOW SUMMARY

### Data Ingestion
1. **Cron triggers** `record-psychology-snapshot` at scheduled intervals
2. Function fetches **symbols from watchlists**
3. Calls `stocktwits-proxy` → StockTwits API for recent messages
4. Sends messages to **Lovable AI API** for extraction

### Processing
5. AI returns structured narratives and emotions
6. Server calculates:
   - Velocity (vs prior snapshot)
   - Concentration metrics
   - Signal detection (inflection, shift, etc.)
   - **NCS (Narrative Coherence Score)** — stored in `observed_state.coherence`
7. Temporal synthesis weights data across periods
8. AI generates interpretation layer (8 lenses)

### Storage
9. Complete snapshot inserted into `psychology_snapshots`
10. Daily price collection runs separately → `price_history`
11. Outcome computation correlates narratives with price moves → `narrative_outcomes`

### Surfacing
12. Frontend hooks (`usePsychologySnapshot`, `useNCSHistory`, etc.) query Supabase
13. Components render:
   - NarrativeCoherenceCard prefers server `coherence`, falls back to client computation
   - NCSTrendChart requires 7+ snapshots for trend display
   - ConfidenceBadge shows High/Moderate/Experimental based on data quality
14. Admin controls allow manual triggering and backfill operations

---

## 8. KNOWN LIMITATIONS / OPEN QUESTIONS

### Technical Debt
- Legacy `narrative_history` and `emotion_history` tables exist alongside newer `psychology_snapshots`
- Some client-side NCS computation remains for snapshots without server-computed coherence
- Rate limiting not fully implemented for StockTwits API calls

### Tradeoffs Made
- Single-tenant cron scheduling (all users share same job timing)
- Admin functions use email-based authorization rather than role-based
- AI extraction can produce inconsistent narrative labels across runs (mitigated by ID normalization)

### Intentionally Deferred
- Real-time WebSocket updates for live message streaming
- Multi-exchange support (currently US stocks only via StockTwits)
- Predictive modeling (explicitly out of scope per design philosophy)
- Automated alert triggering (UI exists, backend trigger not implemented)

### Open Questions
- Optimal weighting for temporal synthesis across timeframes
- Threshold tuning for signal detection (capitulation, euphoria)
- Long-term storage costs for increasing snapshot volume

---

## 9. RECENTLY IMPLEMENTED FEATURES VERIFIED

### ✅ Narrative Coherence Score (NCS) stored at `psychology_snapshots.observed_state.coherence`

**Location:** `supabase/functions/record-psychology-snapshot/index.ts`
- Lines 147-224: `calculateNarrativeCoherence()` function
- Computes: score, entropy, emotion_convergence, velocity_stability, dominant_narrative_share, risk_level, risk_drivers
- Stored in `observed_state.coherence` JSONB field

---

### ✅ NarrativeCoherenceCard prefers server NCS with fallback + "Estimated" indicator

**Location:** `src/components/NarrativeCoherenceCard.tsx`
- Lines 159-164: Server coherence preferred, falls back to `computeCoherenceFromState()`
- Lines 176-189: "Estimated" badge with tooltip when using client-side computation

---

### ✅ NCSTrendChart with 7D/30D/90D toggles and "Insufficient history (x of 7)" rule

**Location:** `src/components/NCSTrendChart.tsx`
- Line 17: `const MIN_SNAPSHOTS = 7;`
- Lines 19-23: `RANGE_OPTIONS` for 7D/30D/90D toggles
- Lines 252-258: Insufficient data state display
- Lines 154-220: `getInterpretation()` function for qualitative labels (Stabilizing, Fragmenting, Churning, etc.)

**Supporting hook:** `src/hooks/use-ncs-history.ts`
- Lines 95-181: Fetches daily/hourly snapshots, aggregates, and extracts coherence data

---

### ✅ Unified ConfidenceBadge (High/Moderate/Experimental) and where it's used

**Location:** `src/components/ui/ConfidenceBadge.tsx`
- Lines 6-60: Type definition, config, and `getConfidenceLevel()` function
- Lines 62-103: `ConfidenceBadge` component with tooltip
- Lines 105-136: `ConfidenceDrivers` utility component

**Usage locations:**
- `NarrativeCoherenceCard.tsx` (line 196)
- `NCSTrendChart.tsx` (lines 7, 37, 45)
- `HistoricalEpisodeMatcher.tsx` (lines 8, 36, 59)
- `NarrativeImpactHistorySection.tsx` (lines 8, 86, 420-422)

---

### ✅ Admin Data Controls panel (backfill / recompute) and backend endpoints

**Frontend Location:** `src/components/AdminDataControls.tsx`
- Lines 163-200: Admin check (`user?.email === "admin@czar.ing"`)
- Lines 88-161: `RefreshPsychologySnapshot` component
- Lines 202-367: Backfill handler with SSE streaming
- Lines 375-422: Recompute NCS handler

**Rendered in:** `src/pages/SettingsPage.tsx`
- Line 33: Import
- Line 434: Rendered in "Data" tab

**Backend Location:** `supabase/functions/admin-backfill-psychology/index.ts`
- Complete implementation for 'backfill' and 'recompute_ncs' actions
- SSE streaming for progress updates
- Admin authorization check

---

*End of Project Snapshot v2*
