-- Schedule hourly sentiment/volume snapshot recording during market hours
-- Runs at :30 of each hour from 9 AM to 5 PM ET (UTC 13:30 to 21:30) on weekdays

SELECT cron.schedule(
  'record-sentiment-snapshot-hourly',
  '30 13-21 * * 1-5',
  $$SELECT net.http_post(
    url := 'https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1/record-sentiment-snapshot',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZXFvb3RscWFtc3ZrcWdkdGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzMxOTYsImV4cCI6MjA4MzgwOTE5Nn0.T5Ir5wuOiQmMF4BOAoxhjEA1aHkab4AJT_H0T3h8b50'
    )
  )$$
);