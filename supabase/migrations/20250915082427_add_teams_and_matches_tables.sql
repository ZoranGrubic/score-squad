-- Create teams table
CREATE TABLE teams (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    external_id integer NOT NULL UNIQUE,
    name text NOT NULL,
    short_name text,
    tla text,
    crest text,
    address text,
    website text,
    founded integer,
    club_colors text,
    venue text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create matches table
CREATE TABLE matches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    external_id integer NOT NULL UNIQUE,
    competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    status text NOT NULL,
    match_date bigint NOT NULL,
    stage text,
    home_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    away_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_teams_external_id ON teams(external_id);
CREATE INDEX idx_matches_external_id ON matches(external_id);
CREATE INDEX idx_matches_competition_id ON matches(competition_id);
CREATE INDEX idx_matches_match_date ON matches(match_date);
CREATE INDEX idx_matches_home_team_id ON matches(home_team_id);
CREATE INDEX idx_matches_away_team_id ON matches(away_team_id);

-- Create trigger functions for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for teams table
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for matches table
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create policies for teams
CREATE POLICY "Teams are viewable by everyone" ON teams
    FOR SELECT USING (true);

CREATE POLICY "Teams are insertable by service role" ON teams
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Teams are updatable by service role" ON teams
    FOR UPDATE USING (auth.role() = 'service_role');

-- Create policies for matches
CREATE POLICY "Matches are viewable by everyone" ON matches
    FOR SELECT USING (true);

CREATE POLICY "Matches are insertable by service role" ON matches
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Matches are updatable by service role" ON matches
    FOR UPDATE USING (auth.role() = 'service_role');