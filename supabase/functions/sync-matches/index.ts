// Optimized Edge Function to sync matches for competitions in our database
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Match {
  id: number;
  status: string;
  utcDate: string;
  stage: string;
  matchday?: number;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
}

interface MatchesResponse {
  matches: Match[];
}

serve(async (req) => {
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

    const footballDataApiKey = Deno.env.get('FOOTBALL_DATA_API_KEY')
    if (!footballDataApiKey) {
      throw new Error('FOOTBALL_DATA_API_KEY environment variable is required')
    }

    console.log('Starting optimized matches sync...')

    // Step 1: Get competitions with code from our database
    console.log('Step 1: Fetching competitions with code from database...')
    const { data: competitions, error: competitionsError } = await supabaseClient
      .from('competitions')
      .select('id, code, name, external_id')
      .not('code', 'is', null)
      .not('code', 'eq', '')

    if (competitionsError) {
      throw new Error(`Error fetching competitions: ${competitionsError.message}`)
    }

    if (!competitions || competitions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No competitions with codes found in database',
          stats: { processed: 0, new: 0, updated: 0, skipped: 0, errors: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${competitions.length} competitions with codes:`, competitions.map(c => c.code).join(', '))

    // Step 2: Calculate date range (today to +7 days)
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const dateFrom = today.toISOString().split('T')[0]
    const dateTo = nextWeek.toISOString().split('T')[0]

    console.log(`Date range: ${dateFrom} to ${dateTo}`)

    let matchStats = { processed: 0, new: 0, updated: 0, skipped: 0, errors: 0 }

    // Step 3: Process each competition
    for (const competition of competitions) {
      try {
        console.log(`\\n--- Processing competition: ${competition.name} (${competition.code}) ---`)

        // Fetch matches for this competition
        const matchesUrl = `https://api.football-data.org/v4/competitions/${competition.code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
        console.log(`Fetching: ${matchesUrl}`)

        const matchesResponse = await fetch(matchesUrl, {
          headers: { 'X-Auth-Token': footballDataApiKey }
        })

        if (!matchesResponse.ok) {
          console.log(`API error for ${competition.code}: ${matchesResponse.status} - ${matchesResponse.statusText}`)
          if (matchesResponse.status === 403) {
            console.log(`Access denied for ${competition.code} - might be a paid tier competition`)
          }
          matchStats.errors++
          continue
        }

        const matchesData: MatchesResponse = await matchesResponse.json()
        const matches = matchesData.matches || []

        console.log(`Found ${matches.length} matches for ${competition.code}`)

        if (matches.length === 0) {
          console.log(`No matches found for ${competition.code} in the specified date range`)
          continue
        }

        // Process each match
        for (const match of matches) {
          try {
            matchStats.processed++
            console.log(`Processing match ${match.id}: ${match.homeTeam.name} vs ${match.awayTeam.name} (${new Date(match.utcDate).toISOString().split('T')[0]})`)

            // Check if match already exists (prevent duplicates)
            const { data: existingMatch, error: checkError } = await supabaseClient
              .from('matches')
              .select('id')
              .eq('external_id', match.id)
              .single()

            if (checkError && checkError.code !== 'PGRST116') {
              console.error(`Error checking existing match ${match.id}:`, checkError)
              matchStats.errors++
              continue
            }

            // Get team IDs from our database
            const { data: homeTeam } = await supabaseClient
              .from('teams')
              .select('id')
              .eq('external_id', match.homeTeam.id)
              .single()

            const { data: awayTeam } = await supabaseClient
              .from('teams')
              .select('id')
              .eq('external_id', match.awayTeam.id)
              .single()

            if (!homeTeam) {
              console.log(`Home team not found in database: ${match.homeTeam.name} (ID: ${match.homeTeam.id})`)
            }
            if (!awayTeam) {
              console.log(`Away team not found in database: ${match.awayTeam.name} (ID: ${match.awayTeam.id})`)
            }

            const matchData = {
              external_id: match.id,
              competition_id: competition.id,
              status: match.status,
              match_date: Math.floor(new Date(match.utcDate).getTime() / 1000), // Convert to unix timestamp in seconds
              stage: match.stage,
              home_team_id: homeTeam?.id || null,
              away_team_id: awayTeam?.id || null,
            }

            if (existingMatch) {
              // Update existing match
              const { error: updateError } = await supabaseClient
                .from('matches')
                .update({
                  status: matchData.status,
                  match_date: matchData.match_date,
                  stage: matchData.stage,
                  home_team_id: matchData.home_team_id,
                  away_team_id: matchData.away_team_id,
                })
                .eq('external_id', match.id)

              if (updateError) {
                console.error(`Error updating match ${match.id}:`, updateError)
                matchStats.errors++
              } else {
                matchStats.updated++
                console.log(`✓ Updated match: ${match.homeTeam.name} vs ${match.awayTeam.name}`)
              }
            } else {
              // Insert new match
              const { error: insertError } = await supabaseClient
                .from('matches')
                .insert(matchData)

              if (insertError) {
                console.error(`Error inserting match ${match.id}:`, insertError)
                matchStats.errors++
              } else {
                matchStats.new++
                console.log(`✓ Added new match: ${match.homeTeam.name} vs ${match.awayTeam.name}`)
              }
            }
          } catch (error) {
            console.error(`Error processing match ${match.id}:`, error)
            matchStats.errors++
          }
        }
      } catch (error) {
        console.error(`Error processing competition ${competition.code}:`, error)
        matchStats.errors++
      }
    }

    const result = {
      success: true,
      message: 'Matches sync completed',
      date_range: { from: dateFrom, to: dateTo },
      competitions_processed: competitions.length,
      stats: matchStats,
    }

    console.log('\\n--- Matches sync completed ---', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Matches sync error:', error)

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