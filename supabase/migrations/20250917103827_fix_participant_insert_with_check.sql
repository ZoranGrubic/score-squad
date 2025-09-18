-- Fix INSERT policy to use WITH CHECK instead of USING
DROP POLICY IF EXISTS "Competition creators can add participants" ON public.friendly_competition_participants;

-- Recreate the policy properly for INSERT operations
CREATE POLICY "Competition creators can add participants" ON public.friendly_competition_participants
    FOR INSERT WITH CHECK (
        competition_id IN (
            SELECT id FROM public.friendly_competitions
            WHERE auth.uid() = created_by
        )
    );