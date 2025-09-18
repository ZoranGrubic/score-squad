-- Add score fields to matches table for comparing with user predictions
-- Based on the API response format you provided

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS home_score INTEGER,
ADD COLUMN IF NOT EXISTS away_score INTEGER,
ADD COLUMN IF NOT EXISTS home_halftime_score INTEGER,
ADD COLUMN IF NOT EXISTS away_halftime_score INTEGER,
ADD COLUMN IF NOT EXISTS winner TEXT CHECK (winner IN ('HOME_TEAM', 'AWAY_TEAM', 'DRAW')),
ADD COLUMN IF NOT EXISTS match_duration TEXT CHECK (match_duration IN ('REGULAR', 'EXTRA_TIME', 'PENALTY_SHOOTOUT')),
ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMPTZ;

-- Create index for quick lookups when comparing predictions
CREATE INDEX IF NOT EXISTS idx_matches_score_status ON public.matches(status, home_score, away_score)
WHERE status = 'FINISHED';

-- Create index for winner comparisons
CREATE INDEX IF NOT EXISTS idx_matches_winner ON public.matches(winner)
WHERE winner IS NOT NULL;