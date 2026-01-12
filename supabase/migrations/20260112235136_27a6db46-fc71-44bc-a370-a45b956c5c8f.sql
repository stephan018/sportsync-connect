-- Create function to add default availability for new teachers
CREATE OR REPLACE FUNCTION public.create_default_teacher_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create availability for teachers
  IF NEW.role = 'teacher' THEN
    -- Insert default availability for Monday to Friday (days 1-5), 9 AM to 5 PM
    INSERT INTO public.availability (teacher_id, day_of_week, start_time, end_time, is_available)
    VALUES 
      (NEW.id, 1, '09:00:00', '12:00:00', true),  -- Monday morning
      (NEW.id, 1, '14:00:00', '17:00:00', true),  -- Monday afternoon
      (NEW.id, 2, '09:00:00', '12:00:00', true),  -- Tuesday morning
      (NEW.id, 2, '14:00:00', '17:00:00', true),  -- Tuesday afternoon
      (NEW.id, 3, '09:00:00', '12:00:00', true),  -- Wednesday morning
      (NEW.id, 3, '14:00:00', '17:00:00', true),  -- Wednesday afternoon
      (NEW.id, 4, '09:00:00', '12:00:00', true),  -- Thursday morning
      (NEW.id, 4, '14:00:00', '17:00:00', true),  -- Thursday afternoon
      (NEW.id, 5, '09:00:00', '12:00:00', true),  -- Friday morning
      (NEW.id, 5, '14:00:00', '17:00:00', true);  -- Friday afternoon
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after teacher profile is inserted
CREATE TRIGGER on_teacher_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_teacher_availability();