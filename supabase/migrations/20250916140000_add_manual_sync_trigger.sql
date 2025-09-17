-- Add function to trigger sync immediately via SQL
CREATE OR REPLACE FUNCTION manual_sync_matches_now()
RETURNS TABLE (
    success boolean,
    message text,
    trigger_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    http_response text;
BEGIN
    -- Trigger the sync
    SELECT net.http_post(
        url:='https://lsulufiexdnagloqbllf.supabase.co/functions/v1/sync-matches',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdWx1ZmlleGRuYWdsb3FibGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzg0OTkxNCwiZXhwIjoyMDczNDI1OTE0fQ.Bd4RSmRKgwzCjDL-wXNcwYRDaTWGQFJrNlVKJYS8i7o", "X-Auth-Token": "419ad0daf3734b2fae1eaf262e8edd0f"}',
        body:='{"source": "manual_sql"}'
    ) INTO http_response;

    -- Return the expected columns
    RETURN QUERY SELECT
        true as success,
        'Manual matches sync triggered at ' || now()::text as message,
        now() as trigger_time;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION manual_sync_matches_now() TO service_role;

-- Also create a simple version that just triggers the cron
CREATE OR REPLACE FUNCTION trigger_sync_via_cron()
RETURNS text
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT net.http_post(
        url:='https://lsulufiexdnagloqbllf.supabase.co/functions/v1/cron-sync-matches',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdWx1ZmlleGRuYWdsb3FibGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzg0OTkxNCwiZXhwIjoyMDczNDI1OTE0fQ.Bd4RSmRKgwzCjDL-wXNcwYRDaTWGQFJrNlVKJYS8i7o"}',
        body:='{"source": "manual_trigger"}'
    )::text;
$$;

GRANT EXECUTE ON FUNCTION trigger_sync_via_cron() TO service_role;