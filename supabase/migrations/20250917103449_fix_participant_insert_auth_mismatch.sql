-- Fix INSERT policy to handle auth.uid vs profile.id mismatch
-- The profiles.id IS the auth user ID, so we need to compare directly

DROP POLICY IF EXISTS "Competition creators can add participants" ON public.friendly_competition_participants;

CREATE POLICY "Competition creators can add participants" ON public.friendly_competition_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.friendly_competitions
            WHERE id = competition_id
            AND created_by = auth.uid()
        )
    );