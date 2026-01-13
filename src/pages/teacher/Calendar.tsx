import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Booking, Profile } from '@/types/database';
import { sendBookingNotification } from '@/lib/notifications';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User,
  Loader2
} from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addWeeks, 
  addMonths, 
  subWeeks, 
  subMonths,
  parseISO,
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BookingWithStudent extends Booking {
  student: Profile;
}

type ViewMode = 'week' | 'month';

export default function TeacherCalendar() {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [bookings, setBookings] = useState<BookingWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithStudent | null>(null);

  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
      };
    }
    return {
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    };
  }, [currentDate, viewMode]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  useEffect(() => {
    if (profile?.id) {
      fetchBookings();
    }
  }, [profile?.id, dateRange]);

  const fetchBookings = async () => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          student:profiles!bookings_student_id_fkey(*)
        `)
        .eq('teacher_id', profile.id)
        .gte('booking_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('booking_date', format(dateRange.end, 'yyyy-MM-dd'))
        .in('status', ['confirmed', 'pending', 'completed'])
        .order('start_time', { ascending: true });

      if (error) throw error;
      setBookings(data as unknown as BookingWithStudent[]);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(b => isSameDay(parseISO(b.booking_date), day));
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-primary text-primary-foreground';
      case 'pending':
        return 'bg-warning/20 text-warning-foreground border border-warning';
      case 'completed':
        return 'bg-success/20 text-success';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'pending':
        return 'Pendiente';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const headerTitle = viewMode === 'week' 
    ? `${format(dateRange.start, 'd MMM', { locale: es })} - ${format(dateRange.end, 'd MMM yyyy', { locale: es })}`
    : format(currentDate, 'MMMM yyyy', { locale: es });

  return (
    <DashboardLayout>
      <div className="p-8 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-primary" />
              Calendario
            </h1>
            <p className="text-muted-foreground mt-1">
              Ver y gestionar tus sesiones programadas
            </p>
          </div>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mes</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Hoy
            </Button>
          </div>
          <h2 className="text-xl font-semibold capitalize">{headerTitle}</h2>
        </div>

        {/* Calendar Grid */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : viewMode === 'week' ? (
              <WeekView 
                days={days} 
                getBookingsForDay={getBookingsForDay}
                getStatusColor={getStatusColor}
                onSelectBooking={setSelectedBooking}
              />
            ) : (
              <MonthView 
                days={days} 
                currentDate={currentDate}
                getBookingsForDay={getBookingsForDay}
                getStatusColor={getStatusColor}
                onSelectBooking={setSelectedBooking}
              />
            )}
          </CardContent>
        </Card>

        {/* Booking Detail Modal */}
        {selectedBooking && (
          <BookingDetailModal 
            booking={selectedBooking} 
            onClose={() => setSelectedBooking(null)}
            onRefresh={fetchBookings}
            getStatusColor={getStatusColor}
            getStatusLabel={getStatusLabel}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

interface ViewProps {
  days: Date[];
  getBookingsForDay: (day: Date) => BookingWithStudent[];
  getStatusColor: (status: string) => string;
  onSelectBooking: (booking: BookingWithStudent) => void;
}

function WeekView({ days, getBookingsForDay, getStatusColor, onSelectBooking }: ViewProps) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-8 border-b border-border flex-shrink-0">
        <div className="p-3 text-center text-xs text-muted-foreground border-r border-border">
          Hora
        </div>
        {days.map((day) => (
          <div 
            key={day.toISOString()} 
            className={cn(
              "p-3 text-center border-r border-border last:border-r-0",
              isToday(day) && "bg-primary/5"
            )}
          >
            <p className="text-xs text-muted-foreground">{format(day, 'EEE', { locale: es })}</p>
            <p className={cn(
              "text-lg font-semibold",
              isToday(day) && "text-primary"
            )}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-8">
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="p-2 text-xs text-muted-foreground text-right border-r border-b border-border h-20 flex items-start justify-end">
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
              {days.map((day) => {
                const dayBookings = getBookingsForDay(day).filter(b => {
                  const bookingHour = parseInt(b.start_time.split(':')[0]);
                  return bookingHour === hour;
                });

                return (
                  <div 
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      "border-r border-b border-border last:border-r-0 h-20 p-1 relative",
                      isToday(day) && "bg-primary/5"
                    )}
                  >
                    {dayBookings.map((booking) => (
                      <button
                        key={booking.id}
                        onClick={() => onSelectBooking(booking)}
                        className={cn(
                          "w-full p-1.5 rounded text-left text-xs truncate mb-1",
                          getStatusColor(booking.status)
                        )}
                      >
                        <p className="font-medium truncate">{booking.student?.full_name}</p>
                        <p className="opacity-80 truncate">
                          {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                        </p>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface MonthViewProps extends ViewProps {
  currentDate: Date;
}

function MonthView({ days, currentDate, getBookingsForDay, getStatusColor, onSelectBooking }: MonthViewProps) {
  // Pad to start from Monday
  const firstDay = days[0];
  const startPadding = (firstDay.getDay() + 6) % 7;
  const paddedDays = [
    ...Array(startPadding).fill(null),
    ...days
  ];

  // Ensure we have complete weeks
  const endPadding = (7 - (paddedDays.length % 7)) % 7;
  const allDays = [...paddedDays, ...Array(endPadding).fill(null)];

  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
          <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-r border-border last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-rows-5 lg:grid-rows-6">
        {weeks.slice(0, 6).map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((day, dayIndex) => {
              if (!day) {
                return (
                  <div key={`empty-${dayIndex}`} className="p-2 bg-muted/30 border-r border-border last:border-r-0" />
                );
              }

              const dayBookings = getBookingsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div 
                  key={day.toISOString()}
                  className={cn(
                    "p-2 border-r border-border last:border-r-0 min-h-24 overflow-hidden",
                    !isCurrentMonth && "bg-muted/30",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  <p className={cn(
                    "text-sm font-medium mb-1",
                    !isCurrentMonth && "text-muted-foreground",
                    isToday(day) && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </p>
                  <div className="space-y-1">
                    {dayBookings.slice(0, 3).map((booking) => (
                      <button
                        key={booking.id}
                        onClick={() => onSelectBooking(booking)}
                        className={cn(
                          "w-full p-1 rounded text-xs truncate text-left",
                          getStatusColor(booking.status)
                        )}
                      >
                        {booking.start_time.slice(0, 5)} {booking.student?.full_name?.split(' ')[0]}
                      </button>
                    ))}
                    {dayBookings.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{dayBookings.length - 3} más
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

interface BookingDetailModalProps {
  booking: BookingWithStudent;
  onClose: () => void;
  onRefresh: () => void;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

function BookingDetailModal({ booking, onClose, onRefresh, getStatusColor, getStatusLabel }: BookingDetailModalProps) {
  const [updating, setUpdating] = useState(false);

  const handleConfirm = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);

      if (error) throw error;

      // Send confirmation notification
      sendBookingNotification(booking.id, 'confirmed');
      
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error confirming booking:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);

      if (error) throw error;

      // Send cancellation notification
      sendBookingNotification(booking.id, 'cancelled');
      
      onRefresh();
      onClose();
    } catch (error) {
      console.error('Error cancelling booking:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Detalles de la Sesión</span>
            <Badge className={getStatusColor(booking.status)}>
              {getStatusLabel(booking.status)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{booking.student?.full_name}</p>
              <p className="text-sm text-muted-foreground">Estudiante</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="w-4 h-4" />
              <span>{format(parseISO(booking.booking_date), "d 'de' MMM yyyy", { locale: es })}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Precio de la Sesión</span>
              <span className="text-xl font-bold text-primary">${Number(booking.total_price).toFixed(2)}</span>
            </div>
          </div>

          {booking.notes && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-1">Notas</p>
              <p className="text-sm">{booking.notes}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {booking.status === 'pending' && (
              <>
                <Button 
                  className="flex-1 gradient-primary" 
                  onClick={handleConfirm}
                  disabled={updating}
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={updating}
                >
                  Cancelar
                </Button>
              </>
            )}
            {booking.status === 'confirmed' && (
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={handleCancel}
                disabled={updating}
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancelar Sesión'}
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
