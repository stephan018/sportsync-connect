import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Availability } from '@/types/database';
import { sendBookingNotification } from '@/lib/notifications';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarDays, Clock, Loader2, ArrowRight } from 'lucide-react';
import { format, addDays, getDay, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface RescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  teacherId: string;
  currentDate: string;
  currentStartTime: string;
  currentEndTime: string;
  totalPrice: number;
  onRescheduled: () => void;
}

export default function RescheduleModal({
  open,
  onOpenChange,
  bookingId,
  teacherId,
  currentDate,
  currentStartTime,
  currentEndTime,
  totalPrice,
  onRescheduled,
}: RescheduleModalProps) {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [existingBookings, setExistingBookings] = useState<{ booking_date: string; start_time: string; end_time: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && teacherId) {
      fetchData();
    }
  }, [open, teacherId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [availRes, bookingsRes] = await Promise.all([
        supabase
          .from('availability')
          .select('*')
          .eq('teacher_id', teacherId)
          .eq('is_available', true),
        supabase
          .from('bookings')
          .select('booking_date, start_time, end_time')
          .eq('teacher_id', teacherId)
          .in('status', ['pending', 'confirmed'])
          .neq('id', bookingId)
          .gte('booking_date', format(new Date(), 'yyyy-MM-dd')),
      ]);

      if (availRes.error) throw availRes.error;
      if (bookingsRes.error) throw bookingsRes.error;

      setAvailability(availRes.data as Availability[]);
      setExistingBookings(bookingsRes.data || []);
    } catch (error) {
      console.error('Error fetching reschedule data:', error);
      toast.error('Error al cargar disponibilidad');
    } finally {
      setLoading(false);
    }
  };

  const availableDaysOfWeek = [...new Set(availability.map(a => a.day_of_week))];

  const isDateAvailable = (date: Date) => {
    const dayOfWeek = getDay(date);
    return availableDaysOfWeek.includes(dayOfWeek) && date >= startOfDay(new Date());
  };

  const getSlotsForDate = (date: Date) => {
    const dayOfWeek = getDay(date);
    const dateStr = format(date, 'yyyy-MM-dd');

    const daySlots = availability.filter(a => a.day_of_week === dayOfWeek);

    // Filter out already booked slots
    return daySlots.filter(slot => {
      const isBooked = existingBookings.some(
        b => b.booking_date === dateStr && b.start_time === slot.start_time && b.end_time === slot.end_time
      );
      // Also exclude the current booking's slot if same date
      const isCurrent = dateStr === currentDate && slot.start_time === currentStartTime && slot.end_time === currentEndTime;
      return !isBooked && !isCurrent;
    });
  };

  const availableSlots = selectedDate ? getSlotsForDate(selectedDate) : [];

  const handleReschedule = async () => {
    if (!selectedDate || !selectedSlot) return;

    setSubmitting(true);
    try {
      const [newStart, newEnd] = selectedSlot.split('-');
      const newDateStr = format(selectedDate, 'yyyy-MM-dd');

      const { error } = await supabase
        .from('bookings')
        .update({
          previous_date: currentDate,
          previous_start_time: currentStartTime,
          previous_end_time: currentEndTime,
          booking_date: newDateStr,
          start_time: newStart,
          end_time: newEnd,
          status: 'pending' as any,
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Send rescheduled notification
      sendBookingNotification(bookingId, 'rescheduled' as any);

      toast.success('¡Reserva reprogramada exitosamente!');
      onOpenChange(false);
      onRescheduled();
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error('Error al reprogramar la reserva');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Reprogramar Sesión
          </DialogTitle>
          <DialogDescription>
            Selecciona una nueva fecha y horario para tu sesión
          </DialogDescription>
        </DialogHeader>

        {/* Current booking info */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="text-muted-foreground mb-1">Horario actual:</p>
          <p className="font-medium capitalize">
            {format(new Date(currentDate + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: es })} • {currentStartTime.slice(0, 5)} - {currentEndTime.slice(0, 5)}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4">
              {/* Date picker */}
              <div>
                <p className="text-sm font-medium mb-2">Nueva fecha</p>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot('');
                  }}
                  disabled={(date) => !isDateAvailable(date)}
                  fromDate={new Date()}
                  toDate={addDays(new Date(), 30)}
                  className="rounded-md border"
                  locale={es}
                />
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div>
                  <p className="text-sm font-medium mb-2">Horarios disponibles</p>
                  {availableSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No hay horarios disponibles para esta fecha
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {availableSlots.map((slot) => {
                        const slotKey = `${slot.start_time}-${slot.end_time}`;
                        const isSelected = selectedSlot === slotKey;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slotKey)}
                            className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Clock className="w-4 h-4" />
                            {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {selectedDate && selectedSlot && (
                <Card className="p-3 border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex-1">
                      <p className="text-muted-foreground line-through capitalize">
                        {format(new Date(currentDate + 'T12:00:00'), "d MMM", { locale: es })} {currentStartTime.slice(0, 5)}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 text-right">
                      <p className="font-semibold text-primary capitalize">
                        {format(selectedDate, "d MMM", { locale: es })} {selectedSlot.split('-')[0].slice(0, 5)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    El precio se mantiene: <span className="font-semibold">${totalPrice}</span>
                  </p>
                </Card>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            disabled={!selectedDate || !selectedSlot || submitting}
            onClick={handleReschedule}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Confirmar Cambio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
