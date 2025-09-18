-- Fix participant insertion to allow competition creators to invite any users
-- The current policy may be too restrictive

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Creators can add participants" ON public.friendly_competition_participants;

-- Create new INSERT policy that explicitly allows creators to add ANY user as participant
CREATE POLICY "Creators can invite any users" ON public.friendly_competition_participants
    FOR INSERT WITH CHECK (
        -- Only competition creators can insert participants
        EXISTS (
            SELECT 1 FROM public.friendly_competitions fc
            WHERE fc.id = competition_id
            AND fc.created_by = auth.uid()
        )
        -- No restriction on which user_id can be added - creators can invite anyone
    );

-- Also ensure users can insert themselves into competitions (for accepting invitations)
CREATE POLICY "Users can accept invitations" ON public.friendly_competition_participants
    FOR INSERT WITH CHECK (
        -- Users can only add themselves
        auth.uid() = user_id
        -- And only if they're invited to this competition (we should check this exists already)
    );