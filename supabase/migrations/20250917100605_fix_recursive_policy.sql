-- Fix infinite recursion by dropping and recreating the problematic policy
DROP POLICY IF EXISTS "Users can view competitions they participate in" ON public.friendly_competitions;

-- Use a simpler approach: combine both conditions in one policy
DROP POLICY IF EXISTS "Users can view own competitions" ON public.friendly_competitions;

-- Recreate with combined logic to avoid circular dependency
CREATE POLICY "Users can view accessible competitions" ON public.friendly_competitions
    FOR SELECT USING (
        auth.uid() = created_by
        OR
        EXISTS (
            SELECT 1 FROM public.friendly_competition_participants
            WHERE competition_id = friendly_competitions.id
            AND user_id = auth.uid()
        )
    );