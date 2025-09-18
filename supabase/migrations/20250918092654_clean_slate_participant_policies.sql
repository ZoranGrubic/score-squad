-- CLEAN SLATE: Remove all existing participant policies and create ONE simple policy
-- This should eliminate any conflicts between multiple policies

-- Drop ALL existing policies for friendly_competition_participants
DROP POLICY IF EXISTS "Users can view participants in their competitions" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Competition creators can manage participants" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Users can update own participation status" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Competition creators can update participants" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Competition creators can delete participants" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Creators can add participants" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Competition creators can add participants" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Creators can invite any users" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Users can accept invitations" ON public.friendly_competition_participants;

-- Create ONE SIMPLE SELECT policy
CREATE POLICY "Anyone can view participants" ON public.friendly_competition_participants
    FOR SELECT USING (true);

-- Create ONE SIMPLE INSERT policy - competition creators can insert ANY participants
CREATE POLICY "Competition creators only can insert participants" ON public.friendly_competition_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.friendly_competitions
            WHERE id = competition_id
            AND created_by = auth.uid()
        )
    );

-- Create ONE SIMPLE UPDATE policy
CREATE POLICY "Competition creators and users can update" ON public.friendly_competition_participants
    FOR UPDATE USING (
        -- Either you're the creator of the competition
        EXISTS (
            SELECT 1 FROM public.friendly_competitions
            WHERE id = competition_id
            AND created_by = auth.uid()
        )
        OR
        -- Or you're updating your own record
        auth.uid() = user_id
    );

-- Create ONE SIMPLE DELETE policy
CREATE POLICY "Competition creators can delete participants" ON public.friendly_competition_participants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.friendly_competitions
            WHERE id = competition_id
            AND created_by = auth.uid()
        )
    );