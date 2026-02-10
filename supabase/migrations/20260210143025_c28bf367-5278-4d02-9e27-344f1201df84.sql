
-- Add slug column for public teacher URLs
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles (slug);

-- Function to generate a URL-friendly slug from full_name
CREATE OR REPLACE FUNCTION public.generate_profile_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Only generate slug for teachers who don't have one yet
  IF NEW.role = 'teacher' AND (NEW.slug IS NULL OR NEW.slug = '') THEN
    -- Create base slug from full_name: lowercase, replace spaces with hyphens, remove special chars
    base_slug := lower(regexp_replace(
      regexp_replace(NEW.full_name, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ));
    
    -- Remove leading/trailing hyphens
    base_slug := trim(both '-' from base_slug);
    
    -- If empty, use 'profesor'
    IF base_slug = '' THEN
      base_slug := 'profesor';
    END IF;
    
    final_slug := base_slug;
    
    -- Check for uniqueness and append counter if needed
    WHILE EXISTS (SELECT 1 FROM profiles WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate slug on insert/update
DROP TRIGGER IF EXISTS trigger_generate_slug ON public.profiles;
CREATE TRIGGER trigger_generate_slug
BEFORE INSERT OR UPDATE OF full_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_profile_slug();

-- Backfill slugs for existing teachers
UPDATE profiles SET slug = NULL WHERE role = 'teacher' AND slug IS NULL;
-- The trigger will fire on update, but since we're setting NULL to NULL it won't trigger.
-- Let's do it properly:
DO $$
DECLARE
  r RECORD;
  base_slug text;
  final_slug text;
  counter integer;
BEGIN
  FOR r IN SELECT id, full_name FROM profiles WHERE role = 'teacher' AND (slug IS NULL OR slug = '') LOOP
    base_slug := lower(regexp_replace(
      regexp_replace(r.full_name, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ));
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN base_slug := 'profesor'; END IF;
    
    final_slug := base_slug;
    counter := 0;
    WHILE EXISTS (SELECT 1 FROM profiles WHERE slug = final_slug AND id != r.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    UPDATE profiles SET slug = final_slug WHERE id = r.id;
  END LOOP;
END;
$$;

-- Allow public read access to teacher profiles for public pages
CREATE POLICY "Public can view teacher profiles by slug"
ON public.profiles
FOR SELECT
USING (role = 'teacher' AND slug IS NOT NULL);
