-- Migration: Create friendly competitions tables
-- Description: Tables for user-created friendly competitions with matches and participants
-- Created: 2025-09-17

-- Friendly competitions table
CREATE TABLE public.friendly_competitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for friendly_competitions
ALTER TABLE public.friendly_competitions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for friendly_competitions (will add participant check later)
CREATE POLICY "Users can view own competitions" ON public.friendly_competitions
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create competitions" ON public.friendly_competitions
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own competitions" ON public.friendly_competitions
    FOR UPDATE USING (auth.uid() = created_by);

-- Friendly competition matches junction table
CREATE TABLE public.friendly_competition_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES public.friendly_competitions(id) ON DELETE CASCADE NOT NULL,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(competition_id, match_id)
);

-- Enable RLS for friendly_competition_matches
ALTER TABLE public.friendly_competition_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendly_competition_matches
CREATE POLICY "Users can view matches in their competitions" ON public.friendly_competition_matches
    FOR SELECT USING (
        competition_id IN (
            SELECT id FROM public.friendly_competitions
            WHERE auth.uid() = created_by
        )
    );

CREATE POLICY "Competition creators can manage matches" ON public.friendly_competition_matches
    FOR ALL USING (
        competition_id IN (
            SELECT id FROM public.friendly_competitions
            WHERE auth.uid() = created_by
        )
    );

-- Friendly competition participants table
CREATE TABLE public.friendly_competition_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES public.friendly_competitions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(competition_id, user_id)
);

-- Enable RLS for friendly_competition_participants
ALTER TABLE public.friendly_competition_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendly_competition_participants
CREATE POLICY "Users can view participants in their competitions" ON public.friendly_competition_participants
    FOR SELECT USING (
        competition_id IN (
            SELECT id FROM public.friendly_competitions
            WHERE auth.uid() = created_by
        ) OR auth.uid() = user_id
    );

CREATE POLICY "Competition creators can manage participants" ON public.friendly_competition_participants
    FOR ALL USING (
        competition_id IN (
            SELECT id FROM public.friendly_competitions
            WHERE auth.uid() = created_by
        )
    );

-- User predictions table
CREATE TABLE public.user_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES public.friendly_competitions(id) ON DELETE CASCADE NOT NULL,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    predicted_winner TEXT CHECK (predicted_winner IN ('home', 'away', 'draw')),
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(competition_id, match_id, user_id)
);

-- Enable RLS for user_predictions
ALTER TABLE public.user_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_predictions
CREATE POLICY "Users can view predictions in their competitions" ON public.user_predictions
    FOR SELECT USING (
        competition_id IN (
            SELECT id FROM public.friendly_competitions
            WHERE auth.uid() = created_by
        ) OR
        competition_id IN (
            SELECT competition_id FROM public.friendly_competition_participants
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own predictions" ON public.user_predictions
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_friendly_competitions_created_by ON public.friendly_competitions(created_by);
CREATE INDEX idx_friendly_competition_matches_competition_id ON public.friendly_competition_matches(competition_id);
CREATE INDEX idx_friendly_competition_matches_match_id ON public.friendly_competition_matches(match_id);
CREATE INDEX idx_friendly_competition_participants_competition_id ON public.friendly_competition_participants(competition_id);
CREATE INDEX idx_friendly_competition_participants_user_id ON public.friendly_competition_participants(user_id);
CREATE INDEX idx_user_predictions_competition_id ON public.user_predictions(competition_id);
CREATE INDEX idx_user_predictions_match_id ON public.user_predictions(match_id);
CREATE INDEX idx_user_predictions_user_id ON public.user_predictions(user_id);

-- Add updated_at triggers
CREATE TRIGGER update_friendly_competitions_updated_at BEFORE UPDATE ON public.friendly_competitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_predictions_updated_at BEFORE UPDATE ON public.user_predictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();