#!/bin/bash

echo "🚀 Testing sync-competitions function..."

response=$(curl -s -X POST "https://lsulufiexdnagloqbllf.supabase.co/functions/v1/sync-competitions" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdWx1ZmlleGRuYWdsb3FibGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDk5MTQsImV4cCI6MjA3MzQyNTkxNH0.-PFdv6qi5aT_SjuOpOOHVKFQFGOpUETMcowB3bPrvIY" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: 419ad0daf3734b2fae1eaf262e8edd0f")

echo "📋 Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

# Check if successful
if echo "$response" | grep -q '"success":true'; then
    echo "✅ Sync completed successfully!"
else
    echo "❌ Sync failed. Check the response above."
fi