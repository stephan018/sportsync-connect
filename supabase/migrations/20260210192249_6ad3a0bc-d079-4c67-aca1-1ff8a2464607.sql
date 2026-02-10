-- Add latitude and longitude columns to profiles for geolocation
ALTER TABLE public.profiles ADD COLUMN latitude double precision DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN longitude double precision DEFAULT NULL;

-- Create index for proximity queries
CREATE INDEX idx_profiles_location_coords ON public.profiles (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;