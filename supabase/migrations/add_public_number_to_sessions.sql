-- Add public_number column to sessions table
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS public_number TEXT DEFAULT NULL;
