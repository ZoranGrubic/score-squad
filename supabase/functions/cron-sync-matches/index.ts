// Cron job to sync matches daily
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Cron job triggered: sync-matches')

    // Get the Supabase URL and service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authToken = '419ad0daf3734b2fae1eaf262e8edd0f'

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required')
    }

    // Call the sync-matches function
    const syncUrl = `${supabaseUrl}/functions/v1/sync-matches`
    console.log(`Calling sync function: ${syncUrl}`)

    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'X-Auth-Token': authToken,
        'Content-Type': 'application/json',
      },
    })

    const responseText = await response.text()
    console.log(`Sync response status: ${response.status}`)
    console.log(`Sync response: ${responseText}`)

    let result
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      result = { raw_response: responseText }
    }

    return new Response(
      JSON.stringify({
        success: response.ok,
        cron_trigger: 'sync-matches',
        sync_status: response.status,
        sync_result: result,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Cron job error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})