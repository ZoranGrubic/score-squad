#!/bin/bash

echo "🔧 Fixing auth and testing sync..."
echo ""
echo "📋 Koraci:"
echo "1. Idi na: https://supabase.com/dashboard/project/lsulufiexdnagloqbllf/settings/api"
echo "2. Kopiraj 'Service role secret' (klikni 'Copy' dugme)"
echo "3. Unesi ovde:"
echo ""

# Prompt for service key
read -p "Zalеpi Service role secret key: " SERVICE_KEY

if [[ -z "$SERVICE_KEY" ]]; then
    echo "❌ Service key nije unet!"
    exit 1
fi

echo ""
echo "🚀 Pozivam sync-matches funkciju..."
echo ""

# Call the function
RESPONSE=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST \
  "https://lsulufiexdnagloqbllf.supabase.co/functions/v1/sync-matches" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "X-Auth-Token: 419ad0daf3734b2fae1eaf262e8edd0f" \
  -d '{"source": "manual"}')

# Extract status code and response body
HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "📊 Response Status: $HTTP_STATUS"
echo "📄 Response Body:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"

echo ""
if [[ "$HTTP_STATUS" == "200" ]]; then
    echo "✅ Sync uspešan!"
    echo ""
    echo "🔍 Proveri u Invocations tab da vidiš detaljne logove."
    echo "🗃️ Ili pokreni u SQL Editor-u:"
    echo "SELECT COUNT(*) FROM matches;"
else
    echo "❌ Sync neuspešan. Status: $HTTP_STATUS"
    echo ""
    echo "Mogući uzroci:"
    echo "- Service key možda nije dobar"
    echo "- Možda je problem sa API ključem"
    echo ""
fi