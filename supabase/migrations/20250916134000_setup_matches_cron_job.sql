-- Add daily matches sync cron job
-- This will call the Edge Function cron-sync-matches every day to sync matches for existing competitions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job that runs daily to sync matches
SELECT cron.schedule(
    'sync-matches-daily',
    '0 8 * * *',  -- Every day at 8:00 AM (1 hour after competitions sync)
    $$
    SELECT
        net.http_post(
            url:='https://lsulufiexdnagloqbllf.supabase.co/functions/v1/cron-sync-matches',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdWx1ZmlleGRuYWdsb3FibGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzg0OTkxNCwiZXhwIjoyMDczNDI1OTE0fQ.Bd4RSmRKgwzCjDL-wXNcwYRDaTWGQFJrNlVKJYS8i7o"}',
            body:='{"source": "cron"}'
        ) as request_id;
    $$
);

-- Create function to manually trigger matches sync
CREATE OR REPLACE FUNCTION trigger_matches_sync()
RETURNS TABLE (
    success boolean,
    message text,
    request_id text
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT
        true as success,
        'Matches sync triggered manually' as message,
        (
            SELECT net.http_post(
                url:='https://lsulufiexdnagloqbllf.supabase.co/functions/v1/cron-sync-matches',
                headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdWx1ZmlleGRuYWdsb3FibGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzg0OTkxNCwiZXhwIjoyMDczNDI1OTE0fQ.Bd4RSmRKgwzCjDL-wXNcwYRDaTWGQFJrNlVKJYS8i7o"}',
                body:='{"source": "manual"}'
            )
        )::text as request_id;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION trigger_matches_sync() TO service_role;