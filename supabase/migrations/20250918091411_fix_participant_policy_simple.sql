-- Simplify participant insertion policy
-- Drop all existing policies and create simpler ones that definitely work

-- Drop all existing policies for participants
DROP POLICY IF EXISTS "Competition creators can add participants" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Users can update own participation status" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Competition creators can update participants" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Competition creators can delete participants" ON public.friendly_competition_participants;

-- Simple and clear INSERT policy - only competition creators can add participants
CREATE POLICY "Creators can add participants" ON public.friendly_competition_participants
    FOR INSERT WITH CHECK (
        -- The user inserting must be the creator of the competition
        EXISTS (
            SELECT 1 FROM public.friendly_competitions fc
            WHERE fc.id = competition_id
            AND fc.created_by = auth.uid()
        )
    );

-- UPDATE policy - users can update their own status, creators can update any
CREATE POLICY "Update participation" ON public.friendly_competition_participants
    FOR UPDATE USING (
        -- Either you're updating your own record
        auth.uid() = user_id
        OR
        -- Or you're the creator of the competition
        EXISTS (
            SELECT 1 FROM public.friendly_competitions fc
            WHERE fc.id = competition_id
            AND fc.created_by = auth.uid()
        )
    );

-- DELETE policy - only creators can delete participants
CREATE POLICY "Creators can delete participants" ON public.friendly_competition_participants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.friendly_competitions fc
            WHERE fc.id = competition_id
            AND fc.created_by = auth.uid()
        )
    );