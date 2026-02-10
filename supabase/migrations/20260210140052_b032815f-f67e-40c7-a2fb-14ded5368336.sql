
-- Extend profiles table for onboarding wizard
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_onboarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS years_of_experience integer,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS skill_level text,
  ADD COLUMN IF NOT EXISTS sports_interests text[] DEFAULT '{}'::text[];
