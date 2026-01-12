-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the cron job to call record-sentiment-snapshot daily at 4 PM ET (21:00 UTC in winter)
SELECT cron.schedule(
  'record-sentiment-snapshot-daily',
  '0 21 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://hteqootlqamsvkqgdtjw.supabase.co/functions/v1/record-sentiment-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);