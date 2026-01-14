-- Schedule hourly psychology snapshots (market hours: 9:30 AM - 4:30 PM ET on weekdays)
-- ET is UTC-5 (winter) or UTC-4 (summer), using UTC-5 for consistency
-- 9:30 AM ET = 14:30 UTC, 4:30 PM ET = 21:30 UTC
SELECT cron.schedule(
  'psychology-snapshot-hourly',
  '30 14-21 * * 1-5',
  $$SELECT net.http_post(
    url := 'https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1/record-psychology-snapshot',
    body := '{"periodType": "hourly"}'::jsonb,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZXFvb3RscWFtc3ZrcWdkdGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzMxOTYsImV4cCI6MjA4MzgwOTE5Nn0.T5Ir5wuOiQmMF4BOAoxhjEA1aHkab4AJT_H0T3h8b50"}'::jsonb
  )$$
);

-- Schedule daily psychology snapshots (4 PM ET = 21:00 UTC on weekdays)
SELECT cron.schedule(
  'psychology-snapshot-daily',
  '0 21 * * 1-5',
  $$SELECT net.http_post(
    url := 'https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1/record-psychology-snapshot',
    body := '{"periodType": "daily"}'::jsonb,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZXFvb3RscWFtc3ZrcWdkdGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzMxOTYsImV4cCI6MjA4MzgwOTE5Nn0.T5Ir5wuOiQmMF4BOAoxhjEA1aHkab4AJT_H0T3h8b50"}'::jsonb
  )$$
);

-- Schedule weekly psychology snapshots (Fridays 5 PM ET = 22:00 UTC)
SELECT cron.schedule(
  'psychology-snapshot-weekly',
  '0 22 * * 5',
  $$SELECT net.http_post(
    url := 'https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1/record-psychology-snapshot',
    body := '{"periodType": "weekly"}'::jsonb,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZXFvb3RscWFtc3ZrcWdkdGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzMxOTYsImV4cCI6MjA4MzgwOTE5Nn0.T5Ir5wuOiQmMF4BOAoxhjEA1aHkab4AJT_H0T3h8b50"}'::jsonb
  )$$
);

-- Schedule monthly psychology snapshots (1st of month 5 PM ET = 22:00 UTC)
SELECT cron.schedule(
  'psychology-snapshot-monthly',
  '0 22 1 * *',
  $$SELECT net.http_post(
    url := 'https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1/record-psychology-snapshot',
    body := '{"periodType": "monthly"}'::jsonb,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZXFvb3RscWFtc3ZrcWdkdGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzMxOTYsImV4cCI6MjA4MzgwOTE5Nn0.T5Ir5wuOiQmMF4BOAoxhjEA1aHkab4AJT_H0T3h8b50"}'::jsonb
  )$$
);

-- Schedule daily cleanup of old psychology snapshots (3 AM UTC)
SELECT cron.schedule(
  'psychology-snapshot-cleanup',
  '0 3 * * *',
  $$SELECT public.cleanup_psychology_snapshots()$$
);