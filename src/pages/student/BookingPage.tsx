import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { sendBookingNotification } from '@/lib/notifications';
import { Profile, Availability, DAYS_OF_WEEK } from '@/types/database';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarDays, Clock, DollarSign, Loader2, Check, X } from 'lucide-react';
import { format, addDays, addMonths, getDay, isSameDay, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

type DurationOption = '1_week' | '2_weeks' | '1_month' | '2_months' | '3_months';

const DURATION_OPTIONS: { value: DurationOption; label: string; days: number }[] = [
  { value: '1_week', label: '1 Semana', days: 7 },
  { value: '2_weeks', label: '2 Semanas', days: 14 },
  { value: '1_month', label: '1 Mes', days: 30 },
  { value: '2_months', label: '2 Meses', days: 60 },
  { value: '3_months', label: '3 Meses', days: 90 },
];

const DAYS_OF_WEEK_ES = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

export default function BookingPage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  
  // Booking form state
  const [startDate, setStartDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [duration, setDuration] = useState<DurationOption>('1_month');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  
  // Calculated dates
  const [calculatedDates, setCalculatedDates] = useState<Date[]>([]);
  const [conflictDates, setConflictDates] = useState<Date[]>([]);

  useEffect(() => {
    if (teacherId) {
      fetchTeacherData();
    }
  }, [teacherId]);

  useEffect(() => {
    if (startDate && selectedDays.length > 0 && duration) {
      calculateBookingDates();
    } else {
      setCalculatedDates([]);
    }
  }, [startDate, selectedDays, duration]);

  const fetchTeacherData = async () => {
    try {
      // Fetch teacher profile
      const { data: teacherData, error: teacherError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', teacherId)
        .single();

      if (teacherError) throw teacherError;
      setTeacher(teacherData as Profile);

      // Fetch teacher availability
      const { data: availData, error: availError } = await supabase
        .from('availability')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('is_available', true);

      if (availError) throw availError;
      setAvailability(availData as Availability[]);
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      toast.error('Error al cargar información del profesor');
    } finally {
      setLoading(false);
    }
  };

  const calculateBookingDates = async () => {
    if (!startDate || selectedDays.length === 0) return;

    const durationDays = DURATION_OPTIONS.find(d => d.value === duration)?.days || 30;
    const endDate = addDays(startDate, durationDays);
    const dates: Date[] = [];
    
    let currentDate = startDate;
    while (isAfter(endDate, currentDate) || isSameDay(endDate, currentDate)) {
      const dayOfWeek = getDay(currentDate);
      if (selectedDays.includes(dayOfWeek)) {
        dates.push(currentDate);
      }
      currentDate = addDays(currentDate, 1);
    }

    setCalculatedDates(dates);

    // Check for conflicts with existing bookings
    if (dates.length > 0 && teacherId) {
      const dateStrings = dates.map(d => format(d, 'yyyy-MM-dd'));
      
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('booking_date')
        .eq('teacher_id', teacherId)
        .in('booking_date', dateStrings)
        .in('status', ['pending', 'confirmed']);

      if (existingBookings) {
        const conflicts = existingBookings.map(b => new Date(b.booking_date));
        setConflictDates(conflicts);
      }
    }
  };

  const toggleDay = (dayValue: number) => {
    // Check if the day is available for this teacher
    const isAvailable = availability.some(a => a.day_of_week === dayValue);
    if (!isAvailable) {
      toast.error(`El profesor no está disponible el ${DAYS_OF_WEEK_ES.find(d => d.value === dayValue)?.label}`);
      return;
    }

    setSelectedDays(prev =>
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const getAvailableTimeSlots = () => {
    if (selectedDays.length === 0) return [];
    
    // Get time slots that are available on ALL selected days
    const slots = new Set<string>();
    
    selectedDays.forEach(day => {
      const dayAvailability = availability.filter(a => a.day_of_week === day);
      dayAvailability.forEach(a => {
        slots.add(`${a.start_time}-${a.end_time}`);
      });
    });

    return Array.from(slots);
  };

  const totalPrice = calculatedDates.length * (Number(teacher?.hourly_rate) || 0);

  const handleBooking = async () => {
    if (!profile?.id || !teacherId || calculatedDates.length === 0 || !selectedTimeSlot) {
      toast.error('Por favor completa todos los detalles de la reserva');
      return;
    }

    setBooking(true);

    try {
      const [startTime, endTime] = selectedTimeSlot.split('-');
      const hourlyRate = Number(teacher?.hourly_rate) || 0;

      // Create bookings for all calculated dates (excluding conflicts)
      const validDates = calculatedDates.filter(
        date => !conflictDates.some(cd => isSameDay(cd, date))
      );

      const bookingsToInsert = validDates.map(date => ({
        student_id: profile.id,
        teacher_id: teacherId,
        booking_date: format(date, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        status: 'pending' as const,
        total_price: hourlyRate,
      }));

      const { data: insertedBookings, error } = await supabase
        .from('bookings')
        .insert(bookingsToInsert)
        .select('id');

      if (error) throw error;

      // Send email notifications for each created booking (fire and forget)
      if (insertedBookings) {
        insertedBookings.forEach((booking) => {
          sendBookingNotification(booking.id, 'created');
        });
      }

      toast.success(`¡${validDates.length} sesiones reservadas exitosamente!`);
      navigate('/bookings');
    } catch (error) {
      console.error('Error creating bookings:', error);
      toast.error('Error al crear las reservas');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!teacher) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Profesor no encontrado</p>
          <Button onClick={() => navigate('/browse')} className="mt-4">
            Volver a Explorar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/browse')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Profesores
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Teacher Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                    {teacher.full_name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{teacher.full_name}</h2>
                    <p className="text-muted-foreground">
                      {teacher.bio || 'Entrenador deportivo profesional'}
                    </p>
                    <Badge className="mt-2 gradient-primary">
                      <DollarSign className="w-3 h-3 mr-1" />
                      ${Number(teacher.hourly_rate)}/hora
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Start Date */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  Seleccionar Fecha de Inicio
                </CardTitle>
                <CardDescription>¿Cuándo te gustaría comenzar tus sesiones?</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date < startOfDay(new Date())}
                  className="rounded-md border"
                  locale={es}
                />
              </CardContent>
            </Card>

            {/* Recurring Days Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Seleccionar Días Recurrentes
                </CardTitle>
                <CardDescription>Elige qué días de la semana quieres asistir</CardDescription>
              </CardHeader>
              <CardContent>
                {availability.length === 0 ? (
                  <div className="text-center py-8 bg-muted/50 rounded-lg">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-semibold text-lg mb-2">Sin Disponibilidad Configurada</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      Este profesor aún no ha configurado sus horarios disponibles. 
                      Por favor contáctalo por mensaje o vuelve más tarde.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => navigate(`/teacher/${teacherId}`)}
                    >
                      Ver Perfil del Profesor
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-7 gap-2">
                      {DAYS_OF_WEEK_ES.map((day) => {
                        const isAvailable = availability.some(a => a.day_of_week === day.value);
                        const isSelected = selectedDays.includes(day.value);
                        
                        return (
                          <button
                            key={day.value}
                            onClick={() => toggleDay(day.value)}
                            disabled={!isAvailable}
                            className={`
                              p-3 rounded-lg border-2 text-center transition-all
                              ${isSelected 
                                ? 'border-primary bg-primary text-primary-foreground' 
                                : isAvailable
                                  ? 'border-border hover:border-primary/50'
                                  : 'border-border bg-muted opacity-50 cursor-not-allowed'
                              }
                            `}
                          >
                            <span className="text-sm font-medium">{day.short}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      Los días en gris no están disponibles para este profesor
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Duration */}
            <Card>
              <CardHeader>
                <CardTitle>Duración del Plan</CardTitle>
                <CardDescription>¿Por cuánto tiempo quieres reservar sesiones?</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={duration} onValueChange={(v) => setDuration(v as DurationOption)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Time Slot */}
            {selectedDays.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Seleccionar Horario</CardTitle>
                  <CardDescription>Elige tu horario preferido</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {getAvailableTimeSlots().map((slot) => {
                      const [start, end] = slot.split('-');
                      return (
                        <button
                          key={slot}
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`
                            p-3 rounded-lg border-2 text-center transition-all
                            ${selectedTimeSlot === slot
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border hover:border-primary/50'
                            }
                          `}
                        >
                          <span className="text-sm font-medium">
                            {start.slice(0, 5)} - {end.slice(0, 5)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Resumen de Reserva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected Dates */}
                {calculatedDates.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Sesiones ({calculatedDates.length} en total)</p>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {calculatedDates.slice(0, 10).map((date, idx) => {
                        const hasConflict = conflictDates.some(cd => isSameDay(cd, date));
                        return (
                          <div 
                            key={idx}
                            className={`flex items-center justify-between text-sm p-2 rounded ${
                              hasConflict ? 'bg-destructive/10' : 'bg-muted'
                            }`}
                          >
                            <span>{format(date, "EEE, d 'de' MMM yyyy", { locale: es })}</span>
                            {hasConflict ? (
                              <X className="w-4 h-4 text-destructive" />
                            ) : (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        );
                      })}
                      {calculatedDates.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          +{calculatedDates.length - 10} sesiones más
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Precio por sesión</span>
                    <span>${Number(teacher.hourly_rate)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Número de sesiones</span>
                    <span>{calculatedDates.length - conflictDates.length}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span className="text-primary">
                      ${(totalPrice - (conflictDates.length * (Number(teacher.hourly_rate) || 0))).toLocaleString()}
                    </span>
                  </div>
                </div>

                {conflictDates.length > 0 && (
                  <p className="text-xs text-destructive">
                    {conflictDates.length} sesión(es) excluida(s) por conflictos de horario
                  </p>
                )}

                <Button
                  className="w-full gradient-primary"
                  size="lg"
                  disabled={
                    booking ||
                    calculatedDates.length === 0 ||
                    !selectedTimeSlot ||
                    calculatedDates.length === conflictDates.length
                  }
                  onClick={handleBooking}
                >
                  {booking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Reservando...
                    </>
                  ) : (
                    'Confirmar Reserva'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
