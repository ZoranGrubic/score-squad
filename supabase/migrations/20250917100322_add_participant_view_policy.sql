-- Add policy to allow participants to view competitions they participate in
CREATE POLICY "Users can view competitions they participate in" ON public.friendly_competitions
    FOR SELECT USING (
        id IN (
            SELECT competition_id FROM public.friendly_competition_participants
            WHERE user_id = auth.uid()
        )
    );