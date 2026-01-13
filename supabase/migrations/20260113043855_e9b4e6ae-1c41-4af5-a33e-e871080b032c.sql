-- Add group pricing and capacity fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS group_hourly_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_students_per_session integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS session_duration integer DEFAULT 60;

-- Add comments for clarity
COMMENT ON COLUMN public.profiles.group_hourly_rate IS 'Hourly rate for group sessions';
COMMENT ON COLUMN public.profiles.max_students_per_session IS 'Maximum number of students per session (1 = individual only)';
COMMENT ON COLUMN public.profiles.session_duration IS 'Default session duration in minutes (30, 45, 60, etc.)';