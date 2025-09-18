-- Clean up and recreate all participant policies
-- This fixes the INSERT policy issues

-- Drop all existing policies
DROP POLICY IF EXISTS "Competition creators can add participants" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Competition creators can manage participants" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Users can update own participation status" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Competition creators can update participants" ON public.friendly_competition_participants;
DROP POLICY IF EXISTS "Competition creators can delete participants" ON public.friendly_competition_participants;

-- Recreate clean policies
-- 1. Competition creators can add participants to their competitions
CREATE POLICY "Competition creators can add participants" ON public.friendly_competition_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.friendly_competitions
            WHERE id = competition_id
            AND created_by = auth.uid()
        )
    );

-- 2. Users can update their own participation status
CREATE POLICY "Users can update own participation status" ON public.friendly_competition_participants
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. Competition creators can update participants in their competitions
CREATE POLICY "Competition creators can update participants" ON public.friendly_competition_participants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.friendly_competitions
            WHERE id = competition_id
            AND created_by = auth.uid()
        )
    );

-- 4. Competition creators can delete participants from their competitions
CREATE POLICY "Competition creators can delete participants" ON public.friendly_competition_participants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.friendly_competitions
            WHERE id = competition_id
            AND created_by = auth.uid()
        )
    );