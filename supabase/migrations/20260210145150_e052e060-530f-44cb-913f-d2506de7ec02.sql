
-- Add reschedule_window_hours to teacher profiles
ALTER TABLE public.profiles
ADD COLUMN reschedule_window_hours integer DEFAULT 24;

-- Add previous booking info columns for audit trail
ALTER TABLE public.bookings
ADD COLUMN previous_date date,
ADD COLUMN previous_start_time time without time zone,
ADD COLUMN previous_end_time time without time zone;

-- Add 'rescheduled' to the booking_status enum
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'rescheduled';
