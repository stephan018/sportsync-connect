-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(booking_id) -- One review per booking
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews (for displaying on teacher profiles)
CREATE POLICY "Reviews are viewable by everyone"
ON public.reviews
FOR SELECT
USING (true);

-- Students can create reviews for their own completed bookings
CREATE POLICY "Students can create reviews for their completed bookings"
ON public.reviews
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = reviews.student_id
    AND profiles.user_id = auth.uid()
    AND profiles.role = 'student'
  )
  AND EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = reviews.booking_id
    AND bookings.student_id = reviews.student_id
    AND bookings.teacher_id = reviews.teacher_id
    AND bookings.status = 'completed'
  )
);

-- Students can update their own reviews
CREATE POLICY "Students can update their own reviews"
ON public.reviews
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = reviews.student_id
    AND profiles.user_id = auth.uid()
  )
);

-- Students can delete their own reviews
CREATE POLICY "Students can delete their own reviews"
ON public.reviews
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = reviews.student_id
    AND profiles.user_id = auth.uid()
  )
);