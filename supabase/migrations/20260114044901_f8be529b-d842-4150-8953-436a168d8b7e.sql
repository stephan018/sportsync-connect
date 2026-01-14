-- Enable realtime for bookings table to receive instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;