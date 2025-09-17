#!/bin/bash

# Test script for sync-matches function
echo "Testing sync-matches function..."

# Get Supabase URL and key from .env file
SUPABASE_URL="https://lsulufiexdnagloqbllf.supabase.co"
AUTH_TOKEN="419ad0daf3734b2fae1eaf262e8edd0f"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdWx1ZmlleGRuYWdsb3FibGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzg0OTkxNCwiZXhwIjoyMDczNDI1OTE0fQ.Bd4RSmRKgwzCjDL-wXNcwYRDaTWGQFJrNlVKJYS8i7o"

# Test the sync-matches function directly
echo "Calling sync-matches function..."

curl -X POST \
  "${SUPABASE_URL}/functions/v1/sync-matches" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${AUTH_TOKEN}" \
  -d '{"source": "test"}'

echo ""
echo "Test completed."