// Cron job Edge Function to sync competitions daily
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    console.log('Cron job: Starting competitions sync...')

    // Call the sync-competitions function with auth token
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-competitions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'X-Auth-Token': '419ad0daf3734b2fae1eaf262e8edd0f',
      },
    })

    if (!response.ok) {
      throw new Error(`Sync function failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('Cron job completed:', result)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cron job completed successfully',
        sync_result: result,
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
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})