# Supabase Edge Functions

This directory contains Edge Functions for the Score Squad application.

## Functions

### sync-competitions
Syncs competition data from football-data.org API to our Supabase database.

**Features:**
- Fetches competitions from football-data.org API
- Updates existing competitions or creates new ones
- Uses external_id to avoid duplicates
- Comprehensive error handling and logging

### cron-sync-competitions
Cron job wrapper that calls sync-competitions function daily.

## Setup

### 1. Environment Variables

In Supabase Dashboard → Project Settings → Edge Functions → Environment variables:

```
FOOTBALL_DATA_API_KEY=your_api_key_from_football_data_org
```

Get your API key from: https://www.football-data.org/client/register

### 2. Deploy Functions

```bash
# Deploy all functions
npm run functions:deploy

# Or deploy individually
npm run functions:deploy-sync
npm run functions:deploy-cron
```

### 3. Set up Cron Job

In Supabase Dashboard → Database → Extensions → pg_cron:

1. Enable pg_cron extension
2. Add cron job:

```sql
-- Run daily at 2 AM UTC
SELECT cron.schedule('daily-competitions-sync', '0 2 * * *', 'SELECT net.http_post(url:=''https://your-project-ref.supabase.co/functions/v1/cron-sync-competitions'', headers:=''{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'') as request_id;');
```

## Available Commands

```bash
# Deploy all functions
npm run functions:deploy

# Deploy specific function
npm run functions:deploy-sync
npm run functions:deploy-cron

# Test sync function manually
npm run functions:invoke-sync

# View function logs
npm run functions:logs
```

## Manual Testing

You can manually trigger the sync (requires auth token):

```bash
# Test sync function with auth token
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/sync-competitions' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -H 'X-Auth-Token: 419ad0daf3734b2fae1eaf262e8edd0f'
```

Or use the npm script:
```bash
npm run functions:invoke-sync
```

## Function URLs

After deployment, functions will be available at:
- `https://your-project-ref.supabase.co/functions/v1/sync-competitions`
- `https://your-project-ref.supabase.co/functions/v1/cron-sync-competitions`

## Monitoring

- Check logs in Supabase Dashboard → Edge Functions → Logs
- Monitor cron job execution in Dashboard → Database → cron.job_run_details
- View competitions table to verify data sync

## Troubleshooting

### Common Issues:

1. **API Key Issues:**
   - Verify FOOTBALL_DATA_API_KEY is set in Environment Variables
   - Check API key is valid on football-data.org

2. **Permission Issues:**
   - Ensure SERVICE_ROLE_KEY has proper permissions
   - Check RLS policies on competitions table

3. **Network Issues:**
   - Verify football-data.org API is accessible
   - Check Supabase function timeouts