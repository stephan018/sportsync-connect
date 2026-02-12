import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Booking, Profile } from '@/types/database';
import { sendBookingNotification } from '@/lib/notifications';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TeacherRescheduleModal from '@/components/bookings/TeacherRescheduleModal';
import BookingFilters, { BookingFilterValues, filterBookings } from '@/components/bookings/BookingFilters';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Timer,
  RefreshCw,
  ChevronRight,
  Users,
  X,
} from 'lucide-react';
import { format, parseISO, isAfter, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BookingWithStudent extends Booking {
  student: Profile;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
}> = {
  confirmed: {
    label: 'Confirmada',
    icon: CheckCircle2,
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600',
    borderClass: 'border-emerald-500/20',
    dotClass: 'bg-emerald-500',
  },
  pending: {
    label: 'Pendiente',
    icon: AlertCircle,
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600',
    borderClass: 'border-amber-500/20',
    dotClass: 'bg-amber-500',
  },
  completed: {
    label: 'Completada',
    icon: CheckCircle2,
    bgClass: 'bg-primary/10',
    textClass: 'text-primary',
    borderClass: 'border-primary/20',
    dotClass: 'bg-primary',
  },
  cancelled: {
    label: 'Cancelada',
    icon: XCircle,
    bgClass: 'bg-destructive/10',
    textClass: 'text-destructive',
    borderClass: 'border-destructive/20',
    dotClass: 'bg-destructive',
  },
};

const DEFAULT_STATUS = {
  label: 'Desconocido',
  icon: Timer,
  bgClass: 'bg-muted',
  textClass: 'text-muted-foreground',
  borderClass: 'border-muted',
  dotClass: 'bg-muted-foreground',
};

export default function TeacherBookings() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingWithStudent | null>(null);
  const [filters, setFilters] = useState<BookingFilterValues>({
    search: '',
    date: undefined,
    status: 'all',
  });

  useEffect(() => {
    if (profile?.id) fetchBookings();
  }, [profile?.id]);

  const fetchBookings = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`*, student:profiles!bookings_student_id_fkey(*)`)
        .eq('teacher_id', profile.id)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setBookings((data as unknown as BookingWithStudent[]) || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);
      if (error) throw error;
      sendBookingNotification(bookingId, 'confirmed');
      toast.success('Reserva confirmada');
      fetchBookings();
    } catch {
      toast.error('Error al confirmar');
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancelled_by: 'teacher' } as any)
        .eq('id', bookingId);
      if (error) throw error;
      sendBookingNotification(bookingId, 'cancelled');
      toast.success('Reserva cancelada');
      fetchBookings();
    } catch {
      toast.error('Error al cancelar');
    }
  };

  const today = new Date();
  const getStudentName = (b: BookingWithStudent) => b.student?.full_name || '';

  const allUpcoming = bookings.filter(
    (b) => isAfter(parseISO(b.booking_date), today) && b.status !== 'cancelled' && b.status !== 'completed'
  );
  const allPast = bookings.filter(
    (b) => !isAfter(parseISO(b.booking_date), today) || b.status === 'completed'
  );
  const allCancelled = bookings.filter((b) => b.status === 'cancelled');

  const upcomingBookings = filterBookings(allUpcoming, filters, getStudentName);
  const pastBookings = filterBookings(allPast, filters, getStudentName);
  const cancelledBookings = filterBookings(allCancelled, filters, getStudentName);

  const stats = [
    { label: 'Próximas', value: allUpcoming.length, color: 'text-primary' },
    { label: 'Completadas', value: allPast.filter((b) => b.status === 'completed').length, color: 'text-emerald-600' },
    { label: 'Canceladas', value: allCancelled.length, color: 'text-destructive' },
  ];

  const BookingCard = ({ booking, showActions = false }: { booking: BookingWithStudent; showActions?: boolean }) => {
    const config = STATUS_CONFIG[booking.status] || DEFAULT_STATUS;
    const StatusIcon = config.icon;
    const isBookingToday = isSameDay(parseISO(booking.booking_date), today);

    return (
      <Card className={cn('relative overflow-hidden transition-all hover:shadow-lg border-l-4', config.borderClass)}>
        {isBookingToday && booking.status !== 'cancelled' && (
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
            ¡Hoy!
          </div>
        )}
        <CardContent className="p-0">
          <div className="flex flex-col">
            <div className="flex-1 p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 ring-2 ring-offset-2 ring-offset-background ring-primary/20 shrink-0">
                  <AvatarImage src={booking.student?.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold">
                    {booking.student?.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base truncate">
                    {booking.student?.full_name}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-y-0.5 sm:gap-x-4 text-xs sm:text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary/70" />
                      <span className="capitalize">
                        {format(parseISO(booking.booking_date), "EEE, d MMM", { locale: es })}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary/70" />
                      {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-muted/30">
              <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full', config.bgClass)}>
                <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', config.dotClass)} />
                <StatusIcon className={cn('w-3.5 h-3.5', config.textClass)} />
                <span className={cn('text-xs font-medium', config.textClass)}>{config.label}</span>
              </div>

              <span className="text-lg font-bold text-foreground">
                ${Number(booking.total_price).toFixed(0)}
              </span>

              {showActions && (
                <div className="flex items-center gap-1">
                  {booking.status === 'pending' && (
                    <Button
                      size="sm"
                      className="h-8 px-2 text-xs gap-1"
                      onClick={() => confirmBooking(booking.id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Confirmar</span>
                    </Button>
                  )}
                  {(booking.status === 'confirmed' || booking.status === 'pending') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs gap-1"
                      onClick={() => setRescheduleBooking(booking)}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reprogramar</span>
                    </Button>
                  )}
                  {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => cancelBooking(booking.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Cancellation attribution */}
            {booking.status === 'cancelled' && (booking as any).cancelled_by && (
              <div className="px-4 py-2 border-t bg-destructive/5 text-xs text-muted-foreground">
                {(booking as any).cancelled_by === 'teacher'
                  ? 'Cancelada por ti'
                  : 'Cancelada por el alumno'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ title, description, actionLabel, onAction }: {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => (
    <Card className="border-dashed">
      <CardContent className="py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-sm mx-auto mb-6">{description}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="gap-2">
            {actionLabel}
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Mis Reservas</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestiona las sesiones de tus alumnos</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 lg:gap-4 mb-6">
          {stats.map((s) => (
            <Card key={s.label} className="text-center py-3">
              <p className={cn('text-xl lg:text-3xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <BookingFilters
          filters={filters}
          onFiltersChange={setFilters}
          searchPlaceholder="Buscar alumno por nombre..."
        />

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full md:w-auto grid grid-cols-3 mb-6 bg-muted/50">
            <TabsTrigger value="upcoming" className="gap-1 sm:gap-2">
              <Timer className="w-4 h-4" />
              <span className="hidden sm:inline">Próximas</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{upcomingBookings.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-1 sm:gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Pasadas</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{pastBookings.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-1 sm:gap-2">
              <XCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Canceladas</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{cancelledBookings.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-0">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : upcomingBookings.length === 0 ? (
              <EmptyState
                title="Sin clases próximas"
                description="Configura tu disponibilidad para empezar a recibir reservas de alumnos."
                actionLabel="Configurar Horarios"
                onAction={() => navigate('/dashboard/availability')}
              />
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((b) => (
                  <BookingCard key={b.id} booking={b} showActions />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-0">
            {pastBookings.length === 0 ? (
              <EmptyState title="Sin sesiones pasadas" description="Las sesiones completadas aparecerán aquí." />
            ) : (
              <div className="space-y-3">
                {pastBookings.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-0">
            {cancelledBookings.length === 0 ? (
              <EmptyState title="Sin cancelaciones" description="Las reservas canceladas aparecerán aquí." />
            ) : (
              <div className="space-y-3">
                {cancelledBookings.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {rescheduleBooking && (
        <TeacherRescheduleModal
          open={!!rescheduleBooking}
          onOpenChange={(open) => { if (!open) setRescheduleBooking(null); }}
          bookingId={rescheduleBooking.id}
          teacherId={rescheduleBooking.teacher_id}
          studentName={rescheduleBooking.student?.full_name || 'Alumno'}
          currentDate={rescheduleBooking.booking_date}
          currentStartTime={rescheduleBooking.start_time}
          currentEndTime={rescheduleBooking.end_time}
          totalPrice={Number(rescheduleBooking.total_price)}
          onRescheduled={() => {
            setRescheduleBooking(null);
            fetchBookings();
          }}
        />
      )}
    </DashboardLayout>
  );
}
