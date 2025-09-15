-- Enable the pg_cron extension for scheduling tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres and service roles
GRANT USAGE ON SCHEMA cron TO postgres, service_role;

-- Create a cron job that runs daily to sync competitions, teams and matches
-- This will call the Edge Function cron-sync-all-data
SELECT cron.schedule(
    'sync-all-data-daily',
    '0 6 * * *',  -- Every day at 6:00 AM
    $$
    SELECT
        net.http_post(
            url:='https://lsulufiexdnagloqbllf.supabase.co/functions/v1/cron-sync-all-data',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdWx1ZmlleGRuYWdsb3FibGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzg0OTkxNCwiZXhwIjoyMDczNDI1OTE0fQ.Bd4RSmRKgwzCjDL-wXNcwYRDaTWGQFJrNlVKJYS8i7o"}',
            body:='{"source": "cron"}'
        ) as request_id;
    $$
);

-- Optional: Create a function to check cron job status
CREATE OR REPLACE FUNCTION get_cron_jobs()
RETURNS TABLE (
    jobid bigint,
    schedule text,
    command text,
    nodename text,
    nodeport integer,
    database text,
    username text,
    active boolean,
    jobname text
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT * FROM cron.job;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION get_cron_jobs() TO service_role;