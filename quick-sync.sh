#!/bin/bash

echo "🔄 Quick sync setup..."
echo ""
echo "📋 Da pokreneš sync ODMAH:"
echo ""
echo "1. Idi na: https://supabase.com/dashboard/project/lsulufiexdnagloqbllf/settings/api"
echo "2. Kopiraj 'Service role secret' key (dugme 'Copy')"
echo "3. Pokreni:"
echo ""
echo "export SERVICE_KEY='tvoj_kopirani_key'"
echo 'curl -X POST https://lsulufiexdnagloqbllf.supabase.co/functions/v1/sync-matches \\'
echo '  -H "Content-Type: application/json" \\'
echo '  -H "Authorization: Bearer $SERVICE_KEY" \\'
echo '  -H "X-Auth-Token: 419ad0daf3734b2fae1eaf262e8edd0f" \\'
echo "  -d '{\"source\": \"manual\"}'"
echo ""
echo "🔍 Ili proverio u SQL Editor-u:"
echo "SELECT * FROM matches ORDER BY created_at DESC LIMIT 5;"
echo ""

# Check current competitions with codes
echo "📊 Trenutna takmičenja sa code-ovima:"
echo ""
echo "Možeš da vidiš koja takmičenja će se sync-ovati sa:"
echo "SELECT name, code FROM competitions WHERE code IS NOT NULL;"
echo ""