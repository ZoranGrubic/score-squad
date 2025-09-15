// Supabase Edge Function to sync competitions from football-data.org API
// This function fetches competitions from the API and syncs them with our database
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Competition {
  id: number;
  name: string;
  code: string;
  type: string;
  emblem: string;
  plan: string;
}

interface FootballDataResponse {
  competitions: Competition[];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify auth token
    const authToken = req.headers.get('X-Auth-Token')
    const expectedToken = '419ad0daf3734b2fae1eaf262e8edd0f'

    if (!authToken || authToken !== expectedToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Invalid or missing X-Auth-Token header',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    console.log('Auth token verified successfully')
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get Football Data API key
    const footballDataApiKey = Deno.env.get('FOOTBALL_DATA_API_KEY')
    if (!footballDataApiKey) {
      throw new Error('FOOTBALL_DATA_API_KEY environment variable is required')
    }

    console.log('Starting competitions sync...')

    // Fetch competitions from football-data.org
    const response = await fetch('https://api.football-data.org/v4/competitions', {
      headers: {
        'X-Auth-Token': footballDataApiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`Football Data API error: ${response.status} ${response.statusText}`)
    }

    const data: FootballDataResponse = await response.json()
    const competitions = data.competitions

    console.log(`Fetched ${competitions.length} competitions from API`)

    // Process each competition
    let newCompetitions = 0
    let updatedCompetitions = 0
    let errors = 0

    for (const competition of competitions) {
      try {
        // Check if competition already exists
        const { data: existingCompetition, error: checkError } = await supabaseClient
          .from('competitions')
          .select('id')
          .eq('external_id', competition.id.toString())
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is expected for new competitions
          console.error(`Error checking competition ${competition.id}:`, checkError)
          errors++
          continue
        }

        const competitionData = {
          external_id: competition.id.toString(),
          name: competition.name,
          code: competition.code,
          type: competition.type,
          emblem: competition.emblem,
          plan: competition.plan,
        }

        if (existingCompetition) {
          // Update existing competition
          const { error: updateError } = await supabaseClient
            .from('competitions')
            .update(competitionData)
            .eq('external_id', competition.id.toString())

          if (updateError) {
            console.error(`Error updating competition ${competition.id}:`, updateError)
            errors++
          } else {
            updatedCompetitions++
            console.log(`Updated competition: ${competition.name}`)
          }
        } else {
          // Insert new competition
          const { error: insertError } = await supabaseClient
            .from('competitions')
            .insert(competitionData)

          if (insertError) {
            console.error(`Error inserting competition ${competition.id}:`, insertError)
            errors++
          } else {
            newCompetitions++
            console.log(`Added new competition: ${competition.name}`)
          }
        }
      } catch (error) {
        console.error(`Error processing competition ${competition.id}:`, error)
        errors++
      }
    }

    const result = {
      success: true,
      message: 'Competitions sync completed',
      stats: {
        total_fetched: competitions.length,
        new_competitions: newCompetitions,
        updated_competitions: updatedCompetitions,
        errors: errors,
      },
    }

    console.log('Sync completed:', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Sync function error:', error)

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