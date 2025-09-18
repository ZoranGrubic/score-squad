-- TEMPORARY: Allow all participant operations for testing
-- This will help identify if the issue is with RLS logic or something else

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Competition creators only can insert participants" ON public.friendly_competition_participants;

-- Create SUPER PERMISSIVE INSERT policy for testing
CREATE POLICY "TEMP allow all participant inserts" ON public.friendly_competition_participants
    FOR INSERT WITH CHECK (true);

-- Note: This is temporary and should be reverted after testing