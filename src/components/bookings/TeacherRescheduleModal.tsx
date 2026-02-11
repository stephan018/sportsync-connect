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
import { Card } from '@/components/ui/card';
import { CalendarDays, Clock, Loader2, ArrowRight, User } from 'lucide-react';
import { format, addDays, getDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TeacherRescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  teacherId: string;
  studentName: string;
  currentDate: string;
  currentStartTime: string;
  currentEndTime: string;
  totalPrice: number;
  onRescheduled: () => void;
}

export default function TeacherRescheduleModal({
  open,
  onOpenChange,
  bookingId,
  teacherId,
  studentName,
  currentDate,
  currentStartTime,
  currentEndTime,
  totalPrice,
  onRescheduled,
}: TeacherRescheduleModalProps) {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [existingBookings, setExistingBookings] = useState<{ booking_date: string; start_time: string; end_time: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && teacherId) {
      setSelectedDate(undefined);
      setSelectedSlot('');
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

    return daySlots.filter(slot => {
      const isBooked = existingBookings.some(b => {
        if (b.booking_date !== dateStr) return false;
        return slot.start_time < b.end_time && slot.end_time > b.start_time;
      });
      const isCurrent = dateStr === currentDate &&
        slot.start_time < currentEndTime && slot.end_time > currentStartTime;
      return !isBooked && !isCurrent;
    });
  };

  const getBookedSlotsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = getDay(date);
    const daySlots = availability.filter(a => a.day_of_week === dayOfWeek);

    return daySlots.filter(slot => {
      const isBooked = existingBookings.some(b => {
        if (b.booking_date !== dateStr) return false;
        return slot.start_time < b.end_time && slot.end_time > b.start_time;
      });
      return isBooked;
    });
  };

  const availableSlots = selectedDate ? getSlotsForDate(selectedDate) : [];
  const bookedSlots = selectedDate ? getBookedSlotsForDate(selectedDate) : [];

  const handleReschedule = async () => {
    if (!selectedDate || !selectedSlot) return;

    setSubmitting(true);
    try {
      const [newStart, newEnd] = selectedSlot.split('-');
      const newDateStr = format(selectedDate, 'yyyy-MM-dd');

      // Race condition guard
      const { data: conflicting } = await supabase
        .from('bookings')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('booking_date', newDateStr)
        .in('status', ['pending', 'confirmed'])
        .neq('id', bookingId)
        .lt('start_time', newEnd)
        .gt('end_time', newStart)
        .limit(1);

      if (conflicting && conflicting.length > 0) {
        toast.error('Este horario acaba de ser reservado. Selecciona otro.');
        await fetchData();
        setSelectedSlot('');
        return;
      }

      const { error } = await supabase
        .from('bookings')
        .update({
          previous_date: currentDate,
          previous_start_time: currentStartTime,
          previous_end_time: currentEndTime,
          booking_date: newDateStr,
          start_time: newStart,
          end_time: newEnd,
          status: 'confirmed' as any,
        })
        .eq('id', bookingId);

      if (error) throw error;

      sendBookingNotification(bookingId, 'rescheduled' as any);

      toast.success('¡Sesión reprogramada! El alumno será notificado.');
      onOpenChange(false);
      onRescheduled();
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error('Error al reprogramar la sesión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Reprogramar Sesión
          </DialogTitle>
          <DialogDescription>
            Mover esta sesión a un nuevo horario. El alumno será notificado automáticamente.
          </DialogDescription>
        </DialogHeader>

        {/* Current session info */}
        <Card className="border-border bg-muted/50 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{studentName}</p>
              <p className="text-xs text-muted-foreground">Sesión actual</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-12">
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="capitalize">
              {format(new Date(currentDate + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
            </span>
            <span>•</span>
            <Clock className="w-3.5 h-3.5" />
            <span>{currentStartTime.slice(0, 5)} - {currentEndTime.slice(0, 5)}</span>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Seleccionar nueva fecha</p>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedSlot('');
                }}
                disabled={(date) => !isDateAvailable(date)}
                fromDate={new Date()}
                toDate={addDays(new Date(), 60)}
                className="rounded-md border mx-auto pointer-events-auto"
                locale={es}
              />
            </div>

            {selectedDate && (
              <div>
                <p className="text-sm font-medium mb-2">Horarios disponibles</p>

                {availableSlots.length === 0 && bookedSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No hay horarios configurados para este día
                  </p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 text-center mb-2">
                    Todos los horarios están ocupados para esta fecha
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {availableSlots.map((slot) => {
                      const slotKey = `${slot.start_time}-${slot.end_time}`;
                      const isSelected = selectedSlot === slotKey;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slotKey)}
                          className={cn(
                            'flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground shadow-glow'
                              : 'border-primary/30 bg-primary/5 hover:border-primary/60 text-foreground'
                          )}
                        >
                          <Clock className="w-4 h-4" />
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </button>
                      );
                    })}
                  </div>
                )}

                {bookedSlots.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Ocupados</p>
                    <div className="grid grid-cols-2 gap-2">
                      {bookedSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-border bg-muted text-muted-foreground text-sm cursor-not-allowed opacity-50"
                        >
                          <Clock className="w-4 h-4" />
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedDate && selectedSlot && (
              <Card className="p-4 border-primary/30 bg-primary/5">
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex-1 text-right">
                    <p className="text-muted-foreground line-through capitalize text-xs">
                      {format(new Date(currentDate + 'T12:00:00'), "d MMM", { locale: es })} • {currentStartTime.slice(0, 5)}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-primary capitalize">
                      {format(selectedDate, "d MMM", { locale: es })} • {selectedSlot.split('-')[0].slice(0, 5)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Precio sin cambios: <span className="font-semibold text-foreground">${totalPrice}</span>
                </p>
              </Card>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1 gradient-primary"
            disabled={!selectedDate || !selectedSlot || submitting}
            onClick={handleReschedule}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Reprogramar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
