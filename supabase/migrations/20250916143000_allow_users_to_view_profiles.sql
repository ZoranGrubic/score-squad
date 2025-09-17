-- Migration: Allow users to view other users' profiles
-- Description: Add RLS policy to allow users to view basic profile information of other users
-- Created: 2025-09-16

-- Add policy to allow authenticated users to view other users' profiles
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');