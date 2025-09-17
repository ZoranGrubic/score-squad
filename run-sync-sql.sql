-- Direct SQL way to trigger sync
-- Run this in Supabase SQL Editor

SELECT
  net.http_post(
    url := 'https://lsulufiexdnagloqbllf.supabase.co/functions/v1/sync-matches',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdWx1ZmlleGRuYWdsb3FibGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjQ5NzQ5NCwiZXhwIjoyMDQyMDczNDk0fQ.6HBRaEjjXa2pN5eE3LiHtcAz0jNV8cTLdklM--PZSjI", "X-Auth-Token": "419ad0daf3734b2fae1eaf262e8edd0f"}',
    body := '{"source": "sql_manual"}'
  ) as sync_result;