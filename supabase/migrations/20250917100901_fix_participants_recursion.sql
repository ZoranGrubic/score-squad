-- Fix infinite recursion by simplifying participants policy
-- Remove the circular dependency with friendly_competitions table

DROP POLICY IF EXISTS "Users can view participants in their competitions" ON public.friendly_competition_participants;

-- Simplified policy: users can view their own participant records only
CREATE POLICY "Users can view own participation" ON public.friendly_competition_participants
    FOR SELECT USING (auth.uid() = user_id);

-- Remove the old policy that was causing circular dependency
DROP POLICY IF EXISTS "Competition creators can manage participants" ON public.friendly_competition_participants;

-- We'll handle creator permissions at the application level for now
-- to avoid circular dependencies between tables