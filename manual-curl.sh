#!/bin/bash

echo "📋 Manual curl test"
echo ""
echo "Zameni YOUR_SERVICE_KEY sa pravim ključem:"
echo ""
echo "curl -X POST https://lsulufiexdnagloqbllf.supabase.co/functions/v1/sync-matches \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer YOUR_SERVICE_KEY' \\"
echo "  -H 'X-Auth-Token: 419ad0daf3734b2fae1eaf262e8edd0f' \\"
echo "  -d '{\"source\": \"manual\"}'"
echo ""

echo "Service role secret dobijaš ovde:"
echo "https://supabase.com/dashboard/project/lsulufiexdnagloqbllf/settings/api"