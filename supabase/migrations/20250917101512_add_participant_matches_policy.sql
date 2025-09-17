-- Add policy to allow participants to view matches in competitions they participate in
CREATE POLICY "Participants can view matches in their competitions" ON public.friendly_competition_matches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.friendly_competition_participants
            WHERE competition_id = friendly_competition_matches.competition_id
            AND user_id = auth.uid()
            AND status = 'accepted'
        )
    );