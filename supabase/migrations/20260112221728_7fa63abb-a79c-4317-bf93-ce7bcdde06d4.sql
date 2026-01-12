-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule hourly narrative/emotion snapshots during extended market hours (7:30 AM - 6:00 PM ET)
-- Runs at 30 minutes past every hour from 12:30 UTC (7:30 ET) to 23:30 UTC (6:30 PM ET)
-- Only on weekdays (Monday-Friday)
SELECT cron.schedule(
  'record-narrative-emotion-hourly',
  '30 12-23 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1/record-narrative-emotion-snapshot',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"periodType": "hourly"}'::jsonb
  )
  $$
);

-- Schedule daily summary at end of day (6:00 PM ET = 23:00 UTC) on weekdays
SELECT cron.schedule(
  'record-narrative-emotion-daily',
  '0 23 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1/record-narrative-emotion-snapshot',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"periodType": "daily"}'::jsonb
  )
  $$
);

-- Schedule cleanup of old records daily at midnight UTC
SELECT cron.schedule(
  'cleanup-old-history',
  '0 0 * * *',
  $$
  SELECT public.cleanup_old_history();
  $$
);