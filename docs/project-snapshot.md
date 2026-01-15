# Retail Sentiment Intelligence Platform - Project Snapshot

**Generated:** 2026-01-15  
**Version:** Production  
**Status:** Active Development

---

## 1. PROJECT OVERVIEW

### Description

The Retail Sentiment Intelligence Platform is an institutional-grade market intelligence tool that provides real-time sentiment and narrative analysis from StockTwits social media data. The platform analyzes retail trader discussions to extract actionable insights including dominant narratives, emotional signals, market psychology indicators, and decision readiness scores across multiple time horizons.

### Primary Use Cases

- **Sentiment Monitoring**: Track bullish/bearish sentiment scores for individual stocks over time
- **Narrative Detection**: Identify and track the top themes and stories driving retail investor discussions
- **Emotion Analysis**: Measure emotional intensity (Fear, Greed, FOMO, Euphoria, Capitulation, etc.) in market discussions
- **Market Psychology**: Aggregate watchlist-level Fear/Greed indices with contrarian signal detection
- **Decision Lens Analysis**: AI-generated advisory summaries tailored to specific corporate decision contexts (Earnings, M&A, Capital Allocation, etc.)
- **Historical Pattern Matching**: Compute narrative-to-price-outcome correlations for forward-looking guidance

### Key Constraints and Guardrails

- **Descriptive, Not Predictive**: The platform describes current market psychology and historical patterns; it does not provide trading recommendations or price predictions
- **StockTwits Data Only**: All sentiment data derives from the StockTwits API; no other social media sources are integrated
- **Retail Trader Focus**: Analysis reflects retail investor sentiment, not institutional positioning
- **Non-Goals**: Native mobile apps, real-time trade execution, financial advice, portfolio management
- **Data Retention Limits**: 
  - Hourly snapshots: 30 days
  - Daily snapshots: 90 days
  - Weekly snapshots: 1 year
  - Monthly snapshots: 3 years

---

## 2. DATABASE SCHEMA

### Table: `alerts`

**Purpose**: User-configured alert rules for sentiment/emotion thresholds on specific symbols.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| user_id | uuid | No | - |
| symbol | text | No | - |
| alert_type | text | No | - |
| threshold | numeric | Yes | - |
| is_active | boolean | No | `true` |
| last_triggered_at | timestamptz | Yes | - |
| created_at | timestamptz | No | `now()` |

**Primary Key**: `id`  
**RLS Policies**: Users can only CRUD their own alerts via `auth.uid() = user_id`

---

### Table: `api_keys`

**Purpose**: User-generated API keys for external programmatic access.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| user_id | uuid | No | - |
| name | text | No | `'Default Key'` |
| key_prefix | text | No | - |
| key_hash | text | No | - |
| is_active | boolean | No | `true` |
| last_used_at | timestamptz | Yes | - |
| created_at | timestamptz | No | `now()` |

**Primary Key**: `id`  
**RLS Policies**: Users can only CRUD their own keys

---

### Table: `emotion_cache`

**Purpose**: Short-term cache for AI-analyzed emotion data per symbol/time range.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| symbol | text | No | - |
| time_range | text | No | - |
| emotions | jsonb | No | - |
| expires_at | timestamptz | No | - |
| created_at | timestamptz | Yes | `now()` |

**Primary Key**: `id`  
**Unique Constraint**: `(symbol, time_range)`  
**RLS Policies**: Public read; service role write

---

### Table: `emotion_history`

**Purpose**: Historical emotion analysis snapshots at hourly/daily granularity.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| symbol | text | No | - |
| period_type | text | No | - |
| recorded_at | timestamptz | No | `now()` |
| emotions | jsonb | No | `'{}'` |
| dominant_emotion | text | Yes | - |
| message_count | integer | No | `0` |
| created_at | timestamptz | No | `now()` |

**Primary Key**: `id`  
**RLS Policies**: Public read; service role write

---

### Table: `lens_summary_cache`

**Purpose**: Cached AI-generated decision lens summaries per symbol/lens type.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| symbol | text | No | - |
| lens | text | No | - |
| summary | text | No | - |
| message_count | integer | Yes | `0` |
| expires_at | timestamptz | No | - |
| created_at | timestamptz | No | `now()` |

**Primary Key**: `id`  
**RLS Policies**: Public read only

---

### Table: `market_psychology_history`

**Purpose**: User-specific market psychology snapshots aggregating watchlist emotions.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| user_id | uuid | No | - |
| fear_greed_index | integer | No | - |
| fear_greed_label | text | No | - |
| dominant_signal | text | Yes | - |
| signal_strength | text | Yes | - |
| symbols | text[] | No | `'{}'` |
| symbol_count | integer | No | `0` |
| emotion_breakdown | jsonb | No | `'{}'` |
| signals | jsonb | No | `'[]'` |
| recorded_at | timestamptz | No | `now()` |
| created_at | timestamptz | No | `now()` |

**Primary Key**: `id`  
**RLS Policies**: Users can only read/insert/delete their own records

---

### Table: `narrative_cache`

**Purpose**: Short-term cache for AI-analyzed narrative data per symbol/time range.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| symbol | text | No | - |
| time_range | text | No | - |
| narratives | jsonb | No | - |
| message_count | integer | Yes | `0` |
| expires_at | timestamptz | No | - |
| created_at | timestamptz | Yes | `now()` |

**Primary Key**: `id`  
**Unique Constraint**: `(symbol, time_range)`  
**RLS Policies**: Public read; service role write

---

### Table: `narrative_history`

**Purpose**: Historical narrative analysis snapshots at hourly/daily granularity.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| symbol | text | No | - |
| period_type | text | No | - |
| recorded_at | timestamptz | No | `now()` |
| narratives | jsonb | No | `'[]'` |
| dominant_narrative | text | Yes | - |
| message_count | integer | No | `0` |
| created_at | timestamptz | No | `now()` |

**Primary Key**: `id`  
**RLS Policies**: Public read; service role write

---

### Table: `price_history`

**Purpose**: Daily stock price data for narrative-outcome correlation analysis.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| symbol | text | No | - |
| date | date | No | - |
| open | numeric | Yes | - |
| high | numeric | Yes | - |
| low | numeric | Yes | - |
| close | numeric | No | - |
| volume | bigint | Yes | - |
| source | text | Yes | `'yahoo'` |
| created_at | timestamptz | Yes | `now()` |

**Primary Key**: `id`  
**Unique Constraint**: `(symbol, date)`  
**RLS Policies**: Public read only

---

### Table: `profiles`

**Purpose**: Extended user profile data including subscription tier and API usage.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| user_id | uuid | No | - |
| email | text | No | - |
| full_name | text | Yes | - |
| company | text | Yes | - |
| subscription_plan | enum | No | `'free'` |
| api_calls_today | integer | No | `0` |
| api_calls_reset_at | timestamptz | No | `now()` |
| created_at | timestamptz | No | `now()` |
| updated_at | timestamptz | No | `now()` |

**Primary Key**: `id`  
**Enum Values**: `free`, `professional`, `enterprise`  
**RLS Policies**: Users can only read/update their own profile

---

### Table: `psychology_snapshots`

**Purpose**: Comprehensive market psychology snapshots with multi-timeframe analysis and AI interpretations.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| symbol | text | No | - |
| period_type | text | No | - |
| snapshot_start | timestamptz | No | - |
| snapshot_end | timestamptz | No | - |
| message_count | integer | No | `0` |
| unique_authors | integer | No | `0` |
| observed_state | jsonb | No | `'{}'` |
| interpretation | jsonb | No | `'{}'` |
| interpretation_version | integer | No | `1` |
| data_confidence | jsonb | No | `'{"score": 0, "drivers": {}}'` |
| historical_context | jsonb | Yes | - |
| narrative_outcomes | jsonb | Yes | `'[]'` |
| created_at | timestamptz | No | `now()` |

**Primary Key**: `id`  
**RLS Policies**: Public read; service role write

**JSONB Structure - `observed_state`**:
```json
{
  "narratives": [{ "id": "...", "label": "...", "prevalence_pct": 35.2, "velocity": {...}, ... }],
  "emotions": [{ "emotion": "Fear", "intensity": 72, "velocity": {...}, ... }],
  "signals": { "emotion_inflection": {...}, "narrative_shift": {...}, ... },
  "concentration": { "top_10_users_pct": 15.2, "bull_bear_polarization": 0.65, ... },
  "momentum": { "overall_sentiment_velocity": 0.15, ... }
}
```

**JSONB Structure - `interpretation`**:
```json
{
  "decision_overlays": { "earnings": { "risk_score": 65, "dominant_concerns": [...], ... }, ... },
  "decision_readiness": { "earnings": { "readiness_score": 72, "recommended_timing": "proceed", ... }, ... },
  "snapshot_summary": { "one_liner": "...", "primary_risk": "...", ... },
  "narrative_persistence": [{ "narrative_id": "...", "classification": "structural", ... }]
}
```

---

### Table: `sentiment_cache`

**Purpose**: Short-term cache for sentiment scores per symbol/time range.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| symbol | text | No | - |
| time_range | text | No | - |
| current_score | numeric | Yes | `50` |
| hourly_data | jsonb | Yes | `'[]'` |
| daily_data | jsonb | Yes | `'[]'` |
| expires_at | timestamptz | No | - |
| created_at | timestamptz | Yes | `now()` |

**Primary Key**: `id`  
**RLS Policies**: Public read; service role write

---

### Table: `sentiment_history`

**Purpose**: Historical sentiment score snapshots with message volume breakdown.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| symbol | text | No | - |
| sentiment_score | numeric | No | - |
| bullish_count | integer | No | `0` |
| bearish_count | integer | No | `0` |
| neutral_count | integer | No | `0` |
| message_volume | integer | No | `0` |
| dominant_emotion | text | Yes | - |
| dominant_narrative | text | Yes | - |
| recorded_at | timestamptz | No | `now()` |
| created_at | timestamptz | No | `now()` |

**Primary Key**: `id`  
**RLS Policies**: Public read; service role write

---

### Table: `volume_cache` / `volume_history`

**Purpose**: Message volume data for activity analysis charts.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| symbol | text | No | - |
| time_range / period_type | text | No | - |
| message_count | integer | Yes | `0` |
| daily_volume | integer | Yes | `0` |
| hourly_data / hourly_distribution | jsonb | Yes | `'[]'` |
| expires_at / recorded_at | timestamptz | No | - |
| created_at | timestamptz | No | `now()` |

---

### Table: `watchlists`

**Purpose**: User-defined symbol watchlists for tracking and analysis.

| Field | Type | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | No | `gen_random_uuid()` |
| user_id | uuid | No | - |
| name | text | No | - |
| symbols | text[] | No | `'{}'` |
| created_at | timestamptz | No | `now()` |
| updated_at | timestamptz | No | `now()` |

**Primary Key**: `id`  
**RLS Policies**: Users can only CRUD their own watchlists

---

## 3. EDGE FUNCTIONS / BACKEND LOGIC

### `stocktwits-proxy`

**Trigger**: HTTP GET/POST  
**Purpose**: Proxy to external StockTwits API with authentication

**Inputs**:
- `action`: `messages` | `symbols` | `stats` | `analytics` | `trending` | `sentiment`
- `symbol`: Stock ticker symbol
- `limit`: Message count limit
- `start`/`end`: Date range for messages

**Outputs**: JSON response from StockTwits API

**Logic**:
1. Parse query parameters for action type
2. Build target StockTwits API URL based on action
3. Forward request with `STOCKTWITS_API_KEY` header
4. Return JSON response

**External Services**: StockTwits API (https://srwjqgmqqsuazsczmywh.supabase.co)  
**Environment Variables**: `STOCKTWITS_API_KEY`

---

### `analyze-narratives`

**Trigger**: HTTP POST  
**Purpose**: Extract top narratives from StockTwits messages using AI

**Inputs**:
- `symbol`: Stock ticker
- `timeRange`: `1H` | `6H` | `24H` | `7D` | `30D`
- `skipCache`: boolean (force refresh)

**Outputs**:
```json
{
  "narratives": [{ "name": "...", "count": 45, "sentiment": "bullish" }],
  "messageCount": 500,
  "cached": false,
  "aggregated": false
}
```

**Logic**:
1. Check `narrative_cache` for valid cached data
2. For 7D/30D, try aggregating from `narrative_history` snapshots first
3. If no cache, fetch messages via `stocktwits-proxy`
4. Call Lovable AI Gateway with structured tool calling
5. Parse AI response for top 8 narratives
6. Cache results with 1-hour TTL (2-hour for aggregated)

**External Services**: Lovable AI Gateway (google/gemini-3-flash-preview)  
**Environment Variables**: `LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STOCKTWITS_API_KEY`

---

### `analyze-emotions`

**Trigger**: HTTP POST  
**Purpose**: Extract emotional sentiment scores from StockTwits messages using AI

**Inputs**: Same as `analyze-narratives`

**Outputs**:
```json
{
  "emotions": [{ "name": "Fear", "score": 72, "percentage": 25, "trend": "rising" }],
  "dominantEmotion": "Fear",
  "emotionalIntensity": "high",
  "historicalData": [{ "timestamp": "...", "label": "...", "emotions": {...} }],
  "messageCount": 500
}
```

**Logic**:
1. Check `emotion_cache` for valid cached data
2. For 7D/30D, aggregate from `emotion_history` snapshots
3. Fetch messages via `stocktwits-proxy`
4. Call Lovable AI to score 15 emotions (Excitement, Fear, FOMO, Greed, Capitulation, Euphoria, etc.)
5. Calculate trends by comparing first half vs second half of data
6. Cache results

**External Services**: Lovable AI Gateway  
**Environment Variables**: Same as above

---

### `record-psychology-snapshot`

**Trigger**: HTTP POST (cron-scheduled)  
**Purpose**: Create comprehensive psychology snapshots with temporal governance and AI interpretation

**Inputs**:
- `symbol`: Stock ticker (optional, processes all watchlist symbols if omitted)
- `periodType`: `hourly` | `daily` | `weekly` | `monthly`
- `forceRun`: boolean

**Outputs**: Summary of recorded snapshots

**Logic** (Multi-Pass Pipeline):
1. **Fetch messages** from StockTwits (scaled limits: 500-2500 based on period)
2. **Calculate mathematical metrics**: concentration, author breadth, confidence score
3. **AI extraction** of Observed State (narratives, emotions, signals)
4. **Compute velocity** against prior snapshot (accelerating/decelerating/stable)
5. **Detect inflection signals**: emotion_inflection, narrative_shift, capitulation_detected, euphoria_risk
6. **Calculate narrative persistence**: structural vs event-driven vs emerging classification
7. **Build temporal synthesis**: weighted composite from hourly/daily/weekly/monthly data
8. **Generate Interpretation layer**: 8 decision lenses with risk scores, readiness scores, recommended actions
9. **Store snapshot** in `psychology_snapshots` table

**Decision Lenses**: earnings, ma, capital_allocation, leadership_change, strategic_pivot, product_launch, activist_risk, corporate_strategy

**Temporal Weighting** (lens-specific):
- Strategic lenses (M&A, Capital Allocation): Zero hourly weight except extreme velocity
- Event-driven lenses (Product Launch): Higher hourly weight (0.20)
- Hourly influence hard-capped at 20%

**External Services**: Lovable AI Gateway (google/gemini-3-flash-preview)  
**Environment Variables**: `LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STOCKTWITS_API_KEY`

---

### `record-sentiment-snapshot`

**Trigger**: HTTP POST (cron-scheduled)  
**Purpose**: Record sentiment scores and volume for watchlist symbols

**Inputs**:
- `symbols`: string[] (optional, defaults to trending + watchlist symbols)

**Outputs**: Summary of recorded snapshots

**Logic**:
1. Fetch trending symbols from `stocktwits-proxy`
2. Get all symbols from `watchlists` table
3. For each symbol: fetch stats, volume analytics, emotion/narrative cache
4. Calculate Fear/Greed index from aggregated emotions
5. Insert records to `sentiment_history` and `volume_history`
6. Update caches with 2-hour TTL
7. For each user, record aggregated `market_psychology_history` snapshot

**External Services**: StockTwits API  
**Environment Variables**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`

---

### `record-narrative-emotion-snapshot`

**Trigger**: HTTP POST (cron-scheduled)  
**Purpose**: Record narrative and emotion snapshots for all watchlist symbols

**Inputs**:
- `periodType`: `hourly` | `daily`
- `forceRun`: boolean

**Outputs**: Summary with narrative/emotion record counts

**Logic**:
1. Check if weekday and within trading hours (unless forceRun)
2. Get unique symbols from all watchlists
3. For each symbol (batched in groups of 3):
   - Call `analyze-narratives` with skipCache
   - Call `analyze-emotions` with skipCache
4. Insert results to `narrative_history` and `emotion_history`
5. Update caches for instant access
6. Run cleanup of old history records

**External Services**: Lovable AI Gateway (via analyze functions)  
**Environment Variables**: Same as above

---

### `compute-narrative-outcomes`

**Trigger**: HTTP POST (cron-scheduled, 5 PM ET weekdays)  
**Purpose**: Calculate historical price outcomes for active narratives

**Inputs**:
- `symbol`: string (optional, processes all watchlist symbols if omitted)

**Outputs**: Summary of computed outcomes

**Logic**:
1. Get symbols from watchlists
2. For each symbol:
   - Fetch 180-day psychology snapshot history
   - Identify current narratives from latest snapshot
   - Rank by prevalence × persistence weight
3. For top 8 narratives:
   - Detect episodes (prevalence ≥25% threshold)
   - Calculate forward returns (5-day, 10-day) from anchor date
   - Apply recency weighting (45-day half-life)
   - Compute confidence score based on sample size and IQR dispersion
4. Update `psychology_snapshots.narrative_outcomes` JSONB field

**Output Structure**:
```json
{
  "narrative_id": "valuation_concerns",
  "label": "Valuation Too High",
  "current_prevalence_pct": 35.2,
  "persistence": "structural",
  "historical_outcomes": {
    "episode_count": 12,
    "avg_price_move_5d": -2.3,
    "avg_price_move_10d": -1.8,
    "win_rate_10d": 42,
    "max_drawdown_avg": -4.5
  },
  "confidence": 0.65,
  "confidence_label": "moderate"
}
```

**External Services**: None (uses stored data)  
**Environment Variables**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

### `collect-daily-prices`

**Trigger**: HTTP POST (cron-scheduled, 4:30 PM ET weekdays)  
**Purpose**: Collect daily stock prices from Yahoo Finance

**Inputs**: None (processes all watchlist symbols)

**Outputs**: Summary of collected prices

**Logic**:
1. Get unique symbols from watchlists
2. Fetch quote data from Yahoo Finance API
3. Upsert to `price_history` table on `(symbol, date)` conflict

**External Services**: Yahoo Finance API  
**Environment Variables**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

### `backfill-price-history`

**Trigger**: HTTP POST (manual)  
**Purpose**: Backfill historical price data for a symbol

**Inputs**:
- `symbol`: Stock ticker
- `days`: Number of days to backfill (default: 180)

**Outputs**: Count of inserted records

**Logic**:
1. Check latest existing price data to avoid redundancy
2. Fetch historical data from Yahoo Finance
3. Filter weekends and old data
4. Batch upsert to `price_history`

---

### `auto-backfill-gaps`

**Trigger**: HTTP POST (manual/admin)  
**Purpose**: Fill missing hourly or daily snapshots for a date range

**Inputs**:
- `symbol`: Stock ticker
- `startDate`, `endDate`: Date range
- `forceHourly`: boolean (hourly mode for today)

**Outputs**: Summary of backfilled records

**Logic** (Hourly Mode):
1. Determine expected hours (5 AM - 6 PM ET)
2. Query existing hourly records
3. For each missing hour: fetch messages, run AI analysis, insert records

**Logic** (Daily Mode):
1. Generate expected weekdays in range
2. Find missing dates from `narrative_history`
3. For each missing date: fetch messages, analyze, insert

---

### `backfill-history`

**Trigger**: HTTP POST (manual)  
**Purpose**: Process uploaded historical messages into time-bucketed snapshots

**Inputs**:
- `symbol`: Stock ticker
- `messages`: Array of message objects
- `startIndex`, `batchSize`: Pagination for large datasets

**Outputs**: Summary with records created per batch

**Logic**:
1. Parse and sort messages by timestamp
2. Group into hourly and daily buckets
3. Process each bucket: call AI for narratives/emotions
4. Insert to `narrative_history` and `emotion_history`

---

### `generate-lens-summary`

**Trigger**: HTTP POST  
**Purpose**: Generate lens-specific AI summary for a symbol

**Inputs**:
- `symbol`: Stock ticker
- `lens`: Decision lens type
- `skipCache`: boolean

**Outputs**: Cached or freshly generated summary text

**Logic**:
1. Check `lens_summary_cache` for valid entry
2. Fetch recent messages from StockTwits
3. Call Lovable AI with lens-specific prompt context
4. Cache result with 30-minute TTL

---

### `stock-price-proxy`

**Trigger**: HTTP GET  
**Purpose**: Proxy stock price data from Yahoo Finance for charts

**Inputs**:
- `symbol`: Stock ticker
- `timeRange`: `1D` | `5D` | `1M` | `3M` | `1Y`

**Outputs**: Formatted price points array

---

## 4. CRON JOBS / SCHEDULED TASKS

| Job Name | Schedule | Trigger | Reads From | Writes To |
|----------|----------|---------|------------|-----------|
| `record-narrative-emotion-hourly` | `:30 * * * *` (every hour) | `record-narrative-emotion-snapshot` | `watchlists`, StockTwits API | `narrative_history`, `emotion_history`, caches |
| `record-narrative-emotion-midnight` | `0 5 * * *` (midnight ET) | `record-narrative-emotion-snapshot` | Same | Same |
| `psychology-snapshot-hourly` | `30 14-21 * * 1-5` (weekday market hours) | `record-psychology-snapshot` | `watchlists`, StockTwits API, prior snapshots | `psychology_snapshots` |
| `psychology-snapshot-daily` | `0 21 * * 1-5` (4 PM ET weekdays) | `record-psychology-snapshot` | Same | Same |
| `psychology-snapshot-weekly` | `0 22 * * 5` (Fridays 5 PM ET) | `record-psychology-snapshot` | Same | Same |
| `psychology-snapshot-monthly` | `0 22 1 * *` (1st of month) | `record-psychology-snapshot` | Same | Same |
| `record-sentiment-snapshot-hourly` | `30 13-21 * * 1-5` | `record-sentiment-snapshot` | `watchlists`, StockTwits API, caches | `sentiment_history`, `volume_history`, `market_psychology_history` |
| `collect-daily-prices` | `30 21 * * 1-5` (4:30 PM ET) | `collect-daily-prices` | `watchlists`, Yahoo Finance | `price_history` |
| `compute-narrative-outcomes` | `0 22 * * 1-5` (5 PM ET) | `compute-narrative-outcomes` | `psychology_snapshots`, `price_history` | `psychology_snapshots.narrative_outcomes` |
| `cleanup-old-history` | `0 0 * * *` (midnight UTC) | `cleanup_old_history()` | - | Deletes old `narrative_history`, `emotion_history` |
| `psychology-snapshot-cleanup` | `0 3 * * *` (3 AM UTC) | `cleanup_psychology_snapshots()` | - | Deletes old `psychology_snapshots` per retention policy |

**Idempotency**: Most snapshot jobs check for existing records before inserting; price collection uses upsert on `(symbol, date)`.

---

## 5. API SURFACE

### Edge Function Endpoints

All endpoints are accessible at: `https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1/{function-name}`

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/stocktwits-proxy` | GET | Proxy StockTwits API | `x-api-key` header |
| `/analyze-narratives` | POST | Extract narratives | None (verify_jwt=false) |
| `/analyze-emotions` | POST | Extract emotions | None |
| `/record-psychology-snapshot` | POST | Create psychology snapshot | None (cron) |
| `/record-sentiment-snapshot` | POST | Create sentiment snapshot | None (cron) |
| `/record-narrative-emotion-snapshot` | POST | Create narrative/emotion snapshots | None (cron) |
| `/compute-narrative-outcomes` | POST | Calculate narrative outcomes | None (cron) |
| `/collect-daily-prices` | POST | Collect stock prices | None (cron) |
| `/backfill-price-history` | POST | Backfill historical prices | None |
| `/backfill-history` | POST | Process historical messages | None |
| `/auto-backfill-gaps` | POST | Fill missing snapshots | None |
| `/generate-lens-summary` | POST | Generate AI lens summary | None |
| `/stock-price-proxy` | GET | Proxy Yahoo Finance prices | None |
| `/get-sentiment-history` | GET | Query sentiment history | None |
| `/backfill-volume-history` | POST | Backfill volume data | None |

### Request/Response Schemas

**POST /analyze-narratives**
```typescript
// Request
{ symbol: string, timeRange: string, skipCache?: boolean }

// Response
{ narratives: Array<{name, count, sentiment}>, messageCount: number, cached: boolean }
```

**POST /record-psychology-snapshot**
```typescript
// Request
{ symbol?: string, periodType?: string, forceRun?: boolean }

// Response
{ success: boolean, symbol: string, snapshot_id: string }
```

---

## 6. FRONTEND / UI STRUCTURE

### Routes

| Route | Component | Auth Required | Description |
|-------|-----------|---------------|-------------|
| `/` | `Index` | No | Landing page with hero, features, pricing |
| `/login` | `LoginPage` | No | User authentication |
| `/signup` | `SignupPage` | No | User registration |
| `/onboarding` | `OnboardingPage` | No | New user setup flow |
| `/dashboard` | `Dashboard` | Yes | Main dashboard with watchlist, psychology |
| `/trending` | `TrendingPage` | Yes | Trending symbols list |
| `/symbol/:symbol` | `SymbolPage` | Yes* | Symbol detail page (*AAPL/NVDA public) |
| `/symbol/:symbol/messages` | `MessagesPage` | Yes* | Message stream |
| `/settings` | `SettingsPage` | Yes | User settings, alerts, API keys |
| `/settings/api-keys` | `SettingsPage` | Yes | API key management |

### Key Components per Page

**Dashboard (`/dashboard`)**
- `MarketPsychologyCard`: Aggregated Fear/Greed for watchlist
- `PsychologyHistoryChart`: 30-day psychology trend
- `WatchlistManager`: Add/remove symbols
- `SearchCommand`: Global symbol search (⌘K)
- Trending list, Alert list

**SymbolPage (`/symbol/:symbol`)**
- `NarrativeChart`: Top narratives with activity bars
- `EmotionChart`: Emotion intensity over time
- `SentimentChart`: Bullish/bearish/neutral breakdown
- `EmotionMomentumChart`: 7-day emotion momentum
- `VolumeChart`: Message volume over time
- `DecisionLensSelector`: 8 lens options
- `DecisionReadinessDashboard`: Readiness score, risk analysis
- `NarrativeImpactHistorySection`: Historical outcomes per narrative
- Representative messages feed

### Data Dependencies

| Component | Data Source |
|-----------|-------------|
| `NarrativeChart` | `useNarrativeAnalysis` → `analyze-narratives` edge function |
| `EmotionChart` | `useEmotionAnalysis` → `analyze-emotions` edge function |
| `SentimentChart` | `useSentimentHistory` → `get-sentiment-history` edge function |
| `DecisionReadinessDashboard` | `usePsychologySnapshot` → `psychology_snapshots` table |
| `MarketPsychologyCard` | `useMarketPsychology` → `analyze-emotions` for each symbol |
| `NarrativeImpactHistorySection` | `usePsychologySnapshot` → `narrative_outcomes` JSONB |

### Conditional Rendering

- AAPL and NVDA symbol pages are publicly accessible (demo)
- All other symbol pages require authentication
- `FillTodayGapsButton` only visible to admin users
- Lens summary shows loading skeleton while fetching
- Charts show `ChartErrorState` with retry on API failure
- Empty states for watchlists, alerts with add CTAs

---

## 7. DATA FLOW SUMMARY

### Data Entry Points

1. **StockTwits API** → Messages, sentiment stats, volume analytics
2. **Yahoo Finance API** → Daily stock prices
3. **User Actions** → Watchlist changes, alert configuration

### Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA COLLECTION                             │
├─────────────────────────────────────────────────────────────────────┤
│  Hourly Cron (:30)          │  Daily Cron (4:30 PM ET)              │
│  ├─ stocktwits-proxy        │  ├─ collect-daily-prices              │
│  ├─ analyze-narratives      │  └─ price_history table               │
│  ├─ analyze-emotions        │                                       │
│  └─ record-*-snapshot       │  Daily Cron (5 PM ET)                 │
│     ├─ narrative_history    │  └─ compute-narrative-outcomes        │
│     ├─ emotion_history      │     └─ psychology_snapshots           │
│     └─ psychology_snapshots │        .narrative_outcomes            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           CACHING LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│  narrative_cache (1-2h TTL)  │  emotion_cache (1-2h TTL)            │
│  sentiment_cache (2h TTL)    │  lens_summary_cache (30m TTL)        │
│  volume_cache (2h TTL)       │                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND QUERIES                            │
├─────────────────────────────────────────────────────────────────────┤
│  useNarrativeAnalysis → POST /analyze-narratives                    │
│  useEmotionAnalysis → POST /analyze-emotions                        │
│  usePsychologySnapshot → SELECT from psychology_snapshots           │
│  useSentimentHistory → GET /get-sentiment-history                   │
│  useDecisionLensSummary → POST /generate-lens-summary               │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Summary

- **Historical Data**: `narrative_history`, `emotion_history`, `sentiment_history`, `psychology_snapshots`, `price_history`, `volume_history`
- **Cache Data**: `narrative_cache`, `emotion_cache`, `sentiment_cache`, `volume_cache`, `lens_summary_cache`
- **User Data**: `profiles`, `watchlists`, `alerts`, `api_keys`, `market_psychology_history`

### User Surfacing

- **Charts**: Rendered from cache or fresh API calls
- **Dashboards**: Aggregated from user's watchlist symbols
- **AI Summaries**: Lens-specific context from `interpretation` JSONB
- **Historical Patterns**: From `narrative_outcomes` JSONB

---

## 8. KNOWN LIMITATIONS / OPEN QUESTIONS

### Known Technical Debt

1. **No Stripe Integration**: Subscription plans exist in schema but payment/enforcement not implemented
2. **No Alert Evaluation Engine**: Alerts table populated but no cron job to evaluate thresholds and send notifications
3. **No Email Notifications**: No transactional email system integrated
4. **API Rate Limiting**: No enforcement of API call limits per user tier
5. **Simplified Timezone Handling**: ET timezone calculated as UTC-5 without DST adjustment

### Architectural Tradeoffs

1. **Cache-First Strategy**: May serve slightly stale data (up to 2 hours) for performance
2. **Single StockTwits Source**: No cross-validation with other social sources
3. **AI Model Dependency**: All narrative/emotion extraction depends on Lovable AI Gateway availability
4. **Hourly Influence Cap**: Strategic lenses deliberately ignore hourly data to reduce noise
5. **Episode Detection Threshold**: Fixed 25% prevalence threshold may miss low-prevalence but significant narratives

### Intentionally Deferred

1. **Real-time WebSocket Updates**: Not implemented; uses polling/cache invalidation
2. **Multi-language Support**: English only
3. **Mobile Native Apps**: Web-only, responsive design
4. **Portfolio Integration**: No connection to brokerage accounts
5. **Custom Alerting Rules**: Only predefined alert types supported
6. **Team/Organization Features**: Single-user focus
7. **Export/Reporting**: No PDF/CSV export functionality

### Open Questions

1. How should we handle market holidays differently from weekends?
2. Should narrative outcome confidence require a minimum episode count before display?
3. What's the right retention policy for high-volume symbols vs low-volume?
4. Should interpretation version be used for cache invalidation?

---

*End of Project Snapshot*
