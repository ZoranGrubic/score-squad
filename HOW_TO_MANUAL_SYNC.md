# 🚀 Kako da pokreneš sync mecova ODMAH

## Opcija 1: Supabase Dashboard (najlakše)
1. Idi na: https://supabase.com/dashboard/project/lsulufiexdnagloqbllf/functions
2. Klikni na `sync-matches` funkciju
3. Klikni "Invoke function"
4. Dodaj headers:
   ```json
   {
     "X-Auth-Token": "419ad0daf3734b2fae1eaf262e8edd0f"
   }
   ```
5. Dodaj body:
   ```json
   {
     "source": "manual"
   }
   ```

## Opcija 2: Curl sa fresh service key
```bash
# Dobij fresh service role key iz Dashboard → Settings → API → Service role secret
# I zameni u trigger-sync-now.sh
./trigger-sync-now.sh
```

## Opcija 3: SQL Editor (kad postaviš migraciju)
```sql
-- U Supabase SQL Editor:
SELECT trigger_sync_via_cron();
```

## Opcija 4: Direktno testiranje
```bash
# Direktan poziv sa validnim service role key:
curl -X POST \
  "https://lsulufiexdnagloqbllf.supabase.co/functions/v1/sync-matches" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer FRESH_SERVICE_ROLE_KEY_HERE" \
  -H "X-Auth-Token: 419ad0daf3734b2fae1eaf262e8edd0f" \
  -d '{"source": "manual"}'
```

## Šta će sync raditi:
1. ✅ Učitaće sva takmičenja sa `code` iz baze
2. ✅ Za svako takmičenje pozvaće: `/competitions/{code}/matches?dateFrom=today&dateTo=+7days`
3. ✅ Proveraviće da li mecovi već postoje (po external_id)
4. ✅ Ubациće samo nove mecove ili ažuriraće postojeće
5. ✅ Logovće sve rezultate

Preporučujem **Opciju 1** jer je najjednostavnija!