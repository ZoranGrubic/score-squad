-- Add INSERT policy for competition creators to add participants
CREATE POLICY "Competition creators can add participants" ON public.friendly_competition_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.friendly_competitions
            WHERE id = competition_id
            AND created_by = auth.uid()
        )
    );