-- Ensure DELETE policy exists for friendly_competitions
-- Drop existing policy if it exists and recreate it to be sure

DROP POLICY IF EXISTS "Users can delete own competitions" ON public.friendly_competitions;

CREATE POLICY "Users can delete own competitions" ON public.friendly_competitions
    FOR DELETE USING (auth.uid() = created_by);

-- Also verify RLS is enabled (should already be, but just to be safe)
ALTER TABLE public.friendly_competitions ENABLE ROW LEVEL SECURITY;