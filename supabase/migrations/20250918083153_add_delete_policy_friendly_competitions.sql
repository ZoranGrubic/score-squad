-- Add DELETE policy for friendly_competitions table
-- This policy allows users to delete competitions they created

CREATE POLICY "Users can delete own competitions" ON public.friendly_competitions
    FOR DELETE USING (auth.uid() = created_by);