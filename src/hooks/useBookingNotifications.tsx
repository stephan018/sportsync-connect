import { useEffect, useCallback, useState, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { soundManager } from '@/lib/sounds';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { DollarSign, CheckCircle, XCircle } from 'lucide-react';

interface BookingPayload {
  id: string;
  student_id: string;
  teacher_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price: number;
}

interface BookingNotificationContextType {
  hasPermission: boolean | null;
  requestNotificationPermission: () => Promise<boolean>;
}

const BookingNotificationContext = createContext<BookingNotificationContextType>({
  hasPermission: null,
  requestNotificationPermission: async () => false,
});

export function useBookingNotifications() {
  const { profile } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Request push notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setHasPermission(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      return granted;
    }

    setHasPermission(false);
    return false;
  }, []);

  // Show push notification
  const showPushNotification = useCallback((title: string, body: string, icon?: string) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'booking-notification',
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    }
  }, []);

  // Handle new booking for teacher
  const handleNewBooking = useCallback(async (booking: BookingPayload) => {
    // Get student name
    const { data: student } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', booking.student_id)
      .single();

    const studentName = student?.full_name || 'Un estudiante';
    const price = Number(booking.total_price).toFixed(0);
    const time = booking.start_time.slice(0, 5);

    // Play satisfying sound
    soundManager.playBookingSound();

    // Show animated toast
    toast.success(
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-bounce">
          <DollarSign className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold">¡Nueva Reserva! 🎉</p>
          <p className="text-sm text-muted-foreground">
            {studentName} reservó una clase por ${price}
          </p>
        </div>
      </div>,
      {
        duration: 8000,
        className: 'animate-scale-in',
      }
    );

    // Show push notification
    showPushNotification(
      '¡Nueva Reserva! 💰',
      `${studentName} ha reservado una clase para el ${booking.booking_date} a las ${time}. Total: $${price}`
    );
  }, [showPushNotification]);

  // Handle booking confirmation for student
  const handleBookingConfirmed = useCallback(async (booking: BookingPayload) => {
    const { data: teacher } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', booking.teacher_id)
      .single();

    const teacherName = teacher?.full_name || 'Tu profesor';

    soundManager.playConfirmSound();

    toast.success(
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-success animate-pulse" />
        </div>
        <div>
          <p className="font-semibold">¡Clase Confirmada! ✅</p>
          <p className="text-sm text-muted-foreground">
            {teacherName} confirmó tu reserva
          </p>
        </div>
      </div>,
      {
        duration: 6000,
      }
    );

    showPushNotification(
      '¡Clase Confirmada! ✅',
      `${teacherName} ha confirmado tu clase para el ${booking.booking_date}`
    );
  }, [showPushNotification]);

  // Handle booking cancellation
  const handleBookingCancelled = useCallback(async (booking: BookingPayload, forTeacher: boolean) => {
    const { data: otherPerson } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', forTeacher ? booking.student_id : booking.teacher_id)
      .single();

    const personName = otherPerson?.full_name || (forTeacher ? 'Un estudiante' : 'Tu profesor');

    toast.error(
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
          <XCircle className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <p className="font-semibold">Reserva Cancelada</p>
          <p className="text-sm text-muted-foreground">
            {personName} canceló la clase del {booking.booking_date}
          </p>
        </div>
      </div>,
      {
        duration: 6000,
      }
    );

    showPushNotification(
      'Reserva Cancelada ❌',
      `La clase del ${booking.booking_date} ha sido cancelada`
    );
  }, [showPushNotification]);

  useEffect(() => {
    if (!profile?.id) return;

    // Request permission on mount
    requestNotificationPermission();

    const isTeacher = profile.role === 'teacher';

    // Subscribe to booking changes
    const channel = supabase
      .channel('booking-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: isTeacher ? `teacher_id=eq.${profile.id}` : `student_id=eq.${profile.id}`,
        },
        (payload) => {
          if (isTeacher && payload.new) {
            handleNewBooking(payload.new as BookingPayload);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: isTeacher ? `teacher_id=eq.${profile.id}` : `student_id=eq.${profile.id}`,
        },
        (payload) => {
          const newBooking = payload.new as BookingPayload;
          const oldBooking = payload.old as BookingPayload;

          // Check if status changed
          if (oldBooking.status !== newBooking.status) {
            if (newBooking.status === 'confirmed' && !isTeacher) {
              handleBookingConfirmed(newBooking);
            } else if (newBooking.status === 'cancelled') {
              handleBookingCancelled(newBooking, isTeacher);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role, handleNewBooking, handleBookingConfirmed, handleBookingCancelled, requestNotificationPermission]);

  return {
    hasPermission,
    requestNotificationPermission,
  };
}

// Context provider for accessing notification settings across the app
export function BookingNotificationProvider({ children }: { children: React.ReactNode }) {
  const { hasPermission, requestNotificationPermission } = useBookingNotifications();

  return (
    <BookingNotificationContext.Provider value={{ hasPermission, requestNotificationPermission }}>
      {children}
    </BookingNotificationContext.Provider>
  );
}

// Hook to access notification settings from any component
export function useNotificationSettings() {
  return useContext(BookingNotificationContext);
}
