#!/bin/bash

echo "🚀 Triggering matches sync manually..."

# Get current service role key - you may need to get fresh one from dashboard
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdWx1ZmlleGRuYWdsb3FibGxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjQ5NzQ5NCwiZXhwIjoyMDQyMDczNDk0fQ.6HBRaEjjXa2pN5eE3LiHtcAz0jNV8cTLdklM--PZSjI"

echo "Calling sync-matches function directly..."
curl -s -X POST \
  "https://lsulufiexdnagloqbllf.supabase.co/functions/v1/sync-matches" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "X-Auth-Token: 419ad0daf3734b2fae1eaf262e8edd0f" \
  -d '{"source": "manual"}' | jq .

echo ""
echo "✅ Manual sync completed!"