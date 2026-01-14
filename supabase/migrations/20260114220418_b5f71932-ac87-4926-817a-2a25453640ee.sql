-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Clean up any existing jobs with same names (idempotent)
SELECT cron.unschedule('collect-daily-prices');
SELECT cron.unschedule('compute-narrative-outcomes');

-- Schedule collect-daily-prices at 4:30 PM ET (21:30 UTC) on weekdays
SELECT cron.schedule(
  'collect-daily-prices',
  '30 21 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1/collect-daily-prices',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZXFvb3RscWFtc3ZrcWdkdGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzMxOTYsImV4cCI6MjA4MzgwOTE5Nn0.T5Ir5wuOiQmMF4BOAoxhjEA1aHkab4AJT_H0T3h8b50'
    )
  );
  $$
);

-- Schedule compute-narrative-outcomes at 5:00 PM ET (22:00 UTC) on weekdays
SELECT cron.schedule(
  'compute-narrative-outcomes',
  '0 22 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1/compute-narrative-outcomes',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZXFvb3RscWFtc3ZrcWdkdGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzMxOTYsImV4cCI6MjA4MzgwOTE5Nn0.T5Ir5wuOiQmMF4BOAoxhjEA1aHkab4AJT_H0T3h8b50'
    )
  );
  $$
);