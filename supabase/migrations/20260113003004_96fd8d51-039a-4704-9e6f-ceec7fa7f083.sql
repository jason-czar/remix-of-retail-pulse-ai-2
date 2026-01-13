-- Update the hourly cron job to run every hour, every day (not just weekdays/trading hours)
SELECT cron.unschedule('record-narrative-emotion-hourly');

SELECT cron.schedule(
  'record-narrative-emotion-hourly',
  '30 * * * *', -- Every hour at :30 (all days)
  $$
  SELECT net.http_post(
    url := 'https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1/record-narrative-emotion-snapshot',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"periodType": "hourly", "forceRun": true}'::jsonb
  )
  $$
);