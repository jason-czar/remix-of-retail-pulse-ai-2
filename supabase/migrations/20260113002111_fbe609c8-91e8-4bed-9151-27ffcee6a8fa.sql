-- Update the daily narrative/emotion snapshot cron job to run at midnight ET (05:00 UTC) every day
SELECT cron.unschedule('record-narrative-emotion-daily');

SELECT cron.schedule(
  'record-narrative-emotion-midnight',
  '0 5 * * *', -- Midnight ET = 05:00 UTC (every day)
  $$
  SELECT net.http_post(
    url := 'https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1/record-narrative-emotion-snapshot',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"periodType": "daily", "forceRun": true}'::jsonb
  )
  $$
);