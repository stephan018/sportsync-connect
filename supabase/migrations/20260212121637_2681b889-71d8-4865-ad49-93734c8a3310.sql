
-- Add cancelled_by column to track who cancelled a booking
ALTER TABLE public.bookings ADD COLUMN cancelled_by text;
