// Comprehensive Edge Function to sync competitions, teams, and matches
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

interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  address: string;
  website: string;
  founded: number;
  clubColors: string;
  venue: string;
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

    console.log('Starting comprehensive sync: competitions, teams, and matches...')

    // Step 1: Sync competitions
    console.log('Step 1: Syncing competitions...')
    const competitionsResponse = await fetch('https://api.football-data.org/v4/competitions', {
      headers: { 'X-Auth-Token': footballDataApiKey },
    })

    if (!competitionsResponse.ok) {
      throw new Error(`Competitions API error: ${competitionsResponse.status}`)
    }

    const competitionsData = await competitionsResponse.json()
    const competitions: Competition[] = competitionsData.competitions

    let competitionStats = { new: 0, updated: 0, errors: 0 }

    // Process competitions
    for (const competition of competitions) {
      try {
        const { data: existing } = await supabaseClient
          .from('competitions')
          .select('id')
          .eq('external_id', competition.id.toString())
          .single()

        const competitionData = {
          external_id: competition.id.toString(),
          name: competition.name,
          code: competition.code,
          type: competition.type,
          emblem: competition.emblem,
          plan: competition.plan,
        }

        if (existing) {
          await supabaseClient
            .from('competitions')
            .update(competitionData)
            .eq('external_id', competition.id.toString())
          competitionStats.updated++
        } else {
          await supabaseClient
            .from('competitions')
            .insert(competitionData)
          competitionStats.new++
        }
      } catch (error) {
        console.error(`Error processing competition ${competition.id}:`, error)
        competitionStats.errors++
      }
    }

    // Step 2: Sync teams for each competition
    console.log('Step 2: Syncing teams...')
    let teamStats = { new: 0, updated: 0, errors: 0 }

    for (const competition of competitions) {
      try {
        const teamsResponse = await fetch(`https://api.football-data.org/v4/competitions/${competition.code}/teams`, {
          headers: { 'X-Auth-Token': footballDataApiKey },
        })

        if (!teamsResponse.ok) {
          console.log(`Skipping teams for ${competition.code}: ${teamsResponse.status}`)
          continue
        }

        const teamsData = await teamsResponse.json()
        const teams: Team[] = teamsData.teams

        for (const team of teams) {
          try {
            const { data: existing } = await supabaseClient
              .from('teams')
              .select('id')
              .eq('external_id', team.id)
              .single()

            const teamData = {
              external_id: team.id,
              name: team.name,
              short_name: team.shortName,
              tla: team.tla,
              crest: team.crest,
              address: team.address,
              website: team.website,
              founded: team.founded,
              club_colors: team.clubColors,
              venue: team.venue,
            }

            if (existing) {
              await supabaseClient
                .from('teams')
                .update(teamData)
                .eq('external_id', team.id)
              teamStats.updated++
            } else {
              await supabaseClient
                .from('teams')
                .insert(teamData)
              teamStats.new++
            }
          } catch (error) {
            console.error(`Error processing team ${team.id}:`, error)
            teamStats.errors++
          }
        }
      } catch (error) {
        console.error(`Error fetching teams for ${competition.code}:`, error)
      }
    }

    // Step 3: Sync matches for each competition
    console.log('Step 3: Syncing matches...')
    let matchStats = { new: 0, updated: 0, errors: 0 }

    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const dateFrom = today.toISOString().split('T')[0]
    const dateTo = nextWeek.toISOString().split('T')[0]

    for (const competition of competitions) {
      try {
        const matchesResponse = await fetch(
          `https://api.football-data.org/v4/competitions/${competition.code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
          { headers: { 'X-Auth-Token': footballDataApiKey } }
        )

        if (!matchesResponse.ok) {
          console.log(`Skipping matches for ${competition.code}: ${matchesResponse.status}`)
          continue
        }

        const matchesData = await matchesResponse.json()
        const matches: Match[] = matchesData.matches || []

        // Get competition UUID from our database
        const { data: competitionRecord, error: competitionError } = await supabaseClient
          .from('competitions')
          .select('id')
          .eq('external_id', competition.id.toString())
          .single()

        if (competitionError) {
          console.error(`Error finding competition ${competition.code} (ID: ${competition.id}):`, competitionError)
        }

        if (!competitionRecord) {
          console.log(`Competition ${competition.code} (ID: ${competition.id}) not found in database`)
          continue
        }

        console.log(`Found competition ${competition.code} with UUID: ${competitionRecord.id}`)

        console.log(`Processing ${matches.length} matches for ${competition.code}`)

        for (const match of matches) {
          try {
            console.log(`Processing match ${match.id}: ${match.homeTeam.name} vs ${match.awayTeam.name}`)

            // Check if match already exists (prevent duplicates)
            const { data: existing, error: existingError } = await supabaseClient
              .from('matches')
              .select('id')
              .eq('external_id', match.id)
              .single()

            // Get team IDs from our database
            const { data: homeTeam, error: homeTeamError } = await supabaseClient
              .from('teams')
              .select('id')
              .eq('external_id', match.homeTeam.id)
              .single()

            const { data: awayTeam, error: awayTeamError } = await supabaseClient
              .from('teams')
              .select('id')
              .eq('external_id', match.awayTeam.id)
              .single()

            if (!homeTeam) {
              console.log(`Home team not found: ${match.homeTeam.name} (ID: ${match.homeTeam.id})`)
            }
            if (!awayTeam) {
              console.log(`Away team not found: ${match.awayTeam.name} (ID: ${match.awayTeam.id})`)
            }

            const matchData = {
              status: match.status,
              match_date: new Date(match.utcDate).getTime(),
              stage: match.stage,
              home_team_id: homeTeam?.id || null,
              away_team_id: awayTeam?.id || null,
            }

            if (existing) {
              // Update existing match
              const { error: updateError } = await supabaseClient
                .from('matches')
                .update(matchData)
                .eq('external_id', match.id)

              if (updateError) {
                console.error(`Error updating match ${match.id}:`, updateError)
                matchStats.errors++
              } else {
                matchStats.updated++
                console.log(`Updated match: ${match.homeTeam.name} vs ${match.awayTeam.name}`)
              }
            } else {
              // Insert new match
              const { error: insertError } = await supabaseClient
                .from('matches')
                .insert({
                  external_id: match.id,
                  competition_id: competitionRecord.id,
                  ...matchData
                })

              if (insertError) {
                console.error(`Error inserting match ${match.id}:`, insertError)
                matchStats.errors++
              } else {
                matchStats.new++
                console.log(`Added new match: ${match.homeTeam.name} vs ${match.awayTeam.name}`)
              }
            }
          } catch (error) {
            console.error(`Error processing match ${match.id}:`, error)
            matchStats.errors++
          }
        }
      } catch (error) {
        console.error(`Error fetching matches for ${competition.code}:`, error)
      }
    }

    const result = {
      success: true,
      message: 'Comprehensive sync completed',
      stats: {
        competitions: competitionStats,
        teams: teamStats,
        matches: matchStats,
      },
    }

    console.log('Comprehensive sync completed:', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Comprehensive sync error:', error)

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