import { supabase } from '@/integrations/supabase/client';

export type BookingEventType = 'created' | 'confirmed' | 'cancelled' | 'rescheduled';

export async function sendBookingNotification(
  bookingId: string,
  eventType: BookingEventType
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-booking-notification', {
      body: { bookingId, eventType },
    });

    if (error) {
      console.error('Failed to send booking notification:', error);
    } else {
      console.log(`Booking notification sent: ${eventType} for booking ${bookingId}`);
    }
  } catch (error) {
    // Don't throw - notifications are non-critical
    console.error('Error sending booking notification:', error);
  }
}
