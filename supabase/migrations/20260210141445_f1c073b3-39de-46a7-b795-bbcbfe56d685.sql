
-- Add aggregate columns for fast reads
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS average_rating numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews integer DEFAULT 0;

-- Create function to recalculate teacher rating aggregates
CREATE OR REPLACE FUNCTION public.update_teacher_rating_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_teacher_id uuid;
  new_avg numeric;
  new_count integer;
BEGIN
  -- Determine which teacher_id to recalculate
  IF TG_OP = 'DELETE' THEN
    target_teacher_id := OLD.teacher_id;
  ELSE
    target_teacher_id := NEW.teacher_id;
  END IF;

  -- Calculate new aggregates
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
  INTO new_avg, new_count
  FROM reviews
  WHERE teacher_id = target_teacher_id;

  -- Update the teacher's profile
  UPDATE profiles
  SET average_rating = ROUND(new_avg, 2),
      total_reviews = new_count
  WHERE id = target_teacher_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on reviews table
DROP TRIGGER IF EXISTS trigger_update_teacher_rating ON public.reviews;
CREATE TRIGGER trigger_update_teacher_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_teacher_rating_aggregates();

-- Backfill existing data
UPDATE profiles p
SET average_rating = sub.avg_rating,
    total_reviews = sub.review_count
FROM (
  SELECT teacher_id, ROUND(AVG(rating), 2) as avg_rating, COUNT(*) as review_count
  FROM reviews
  GROUP BY teacher_id
) sub
WHERE p.id = sub.teacher_id;
