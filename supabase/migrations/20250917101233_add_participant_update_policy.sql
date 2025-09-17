-- Add UPDATE policy for participants to accept/decline invitations
CREATE POLICY "Users can update own participation status" ON public.friendly_competition_participants
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);