import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Booking, Profile } from '@/types/database';
import { sendBookingNotification } from '@/lib/notifications';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReviewModal from '@/components/reviews/ReviewModal';
import { 
  Calendar, 
  Clock, 
  Star, 
  X, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Timer,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { format, parseISO, isAfter, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface BookingWithTeacher extends Booking {
  teacher: Profile;
  hasReview?: boolean;
}

// Sport icons mapping
const SPORT_ICONS: Record<string, string> = {
  'Tenis': '🎾',
  'Pádel': '🏸',
  'Golf': '⛳',
  'Natación': '🏊',
  'Fútbol': '⚽',
  'Baloncesto': '🏀',
  'Yoga': '🧘',
  'Boxeo': '🥊',
  'Surf': '🏄',
  'Esquí': '⛷️',
};

export default function MyBookings() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    booking: BookingWithTeacher | null;
  }>({ open: false, booking: null });

  useEffect(() => {
    if (profile?.id) {
      fetchBookings();
    }
  }, [profile?.id]);

  const fetchBookings = async () => {
    if (!profile?.id) return;

    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          teacher:profiles!bookings_teacher_id_fkey(*)
        `)
        .eq('student_id', profile.id)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (bookingsError) throw bookingsError;

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('booking_id')
        .eq('student_id', profile.id);

      if (reviewsError) throw reviewsError;

      const reviewedBookingIds = new Set(reviewsData?.map((r) => r.booking_id));

      const bookingsWithReviewStatus = (bookingsData as unknown as BookingWithTeacher[]).map(
        (booking) => ({
          ...booking,
          hasReview: reviewedBookingIds.has(booking.id),
        })
      );

      setBookings(bookingsWithReviewStatus);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;
      
      sendBookingNotification(bookingId, 'cancelled');
      
      toast.success('Reserva cancelada exitosamente');
      fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Error al cancelar la reserva');
    }
  };

  const openReviewModal = (booking: BookingWithTeacher) => {
    setReviewModal({ open: true, booking });
  };

  const today = new Date();
  const upcomingBookings = bookings.filter(
    (b) => isAfter(parseISO(b.booking_date), today) && b.status !== 'cancelled' && b.status !== 'completed'
  );
  const pastBookings = bookings.filter(
    (b) => !isAfter(parseISO(b.booking_date), today) || b.status === 'completed'
  );
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');

  const getStatusConfig = (status: string, bookingDate: string) => {
    const isToday = isSameDay(parseISO(bookingDate), today);
    
    switch (status) {
      case 'confirmed':
        return {
          label: 'Confirmada',
          icon: CheckCircle2,
          bgClass: 'bg-emerald-500/10',
          textClass: 'text-emerald-600',
          borderClass: 'border-emerald-500/20',
          dotClass: 'bg-emerald-500'
        };
      case 'pending':
        return {
          label: 'Pendiente',
          icon: AlertCircle,
          bgClass: 'bg-amber-500/10',
          textClass: 'text-amber-600',
          borderClass: 'border-amber-500/20',
          dotClass: 'bg-amber-500'
        };
      case 'completed':
        return {
          label: 'Completada',
          icon: CheckCircle2,
          bgClass: 'bg-primary/10',
          textClass: 'text-primary',
          borderClass: 'border-primary/20',
          dotClass: 'bg-primary'
        };
      case 'cancelled':
        return {
          label: 'Cancelada',
          icon: XCircle,
          bgClass: 'bg-destructive/10',
          textClass: 'text-destructive',
          borderClass: 'border-destructive/20',
          dotClass: 'bg-destructive'
        };
      default:
        return {
          label: status,
          icon: Timer,
          bgClass: 'bg-muted',
          textClass: 'text-muted-foreground',
          borderClass: 'border-muted',
          dotClass: 'bg-muted-foreground'
        };
    }
  };

  const BookingCard = ({
    booking,
    showCancel = false,
    showReview = false,
  }: {
    booking: BookingWithTeacher;
    showCancel?: boolean;
    showReview?: boolean;
  }) => {
    const statusConfig = getStatusConfig(booking.status, booking.booking_date);
    const StatusIcon = statusConfig.icon;
    const sportIcon = booking.teacher?.sport ? SPORT_ICONS[booking.teacher.sport] || '🏅' : '🏅';
    const isToday = isSameDay(parseISO(booking.booking_date), today);
    
    return (
      <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg border-l-4 ${statusConfig.borderClass} bg-card`}>
        {/* Today indicator */}
        {isToday && booking.status !== 'cancelled' && (
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
            ¡Hoy!
          </div>
        )}
        
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Left section - Teacher info */}
            <div className="flex-1 p-5">
              <div className="flex items-start gap-4">
                {/* Avatar with sport icon */}
                <div className="relative">
                  <Avatar className="h-16 w-16 ring-2 ring-offset-2 ring-offset-background ring-primary/20">
                    <AvatarImage src={booking.teacher?.avatar_url || ''} alt={booking.teacher?.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xl font-bold">
                      {booking.teacher?.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 text-lg bg-background rounded-full p-0.5 shadow-sm">
                    {sportIcon}
                  </span>
                </div>
                
                {/* Teacher details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg text-foreground truncate">
                      {booking.teacher?.full_name}
                    </h3>
                    {booking.teacher?.sport && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        {booking.teacher.sport}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Date & Time */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-primary/70" />
                      <span className="capitalize">
                        {format(parseISO(booking.booking_date), "EEEE, d 'de' MMMM", { locale: es })}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary/70" />
                      {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                    </span>
                  </div>
                  
                  {/* Notes if any */}
                  {booking.notes && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                      <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                      {booking.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right section - Status, Price & Actions */}
            <div className="flex md:flex-col items-center justify-between md:justify-center gap-3 p-5 md:border-l border-t md:border-t-0 bg-muted/30 md:w-56">
              {/* Status Badge */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig.bgClass}`}>
                <span className={`w-2 h-2 rounded-full ${statusConfig.dotClass} animate-pulse`} />
                <StatusIcon className={`w-4 h-4 ${statusConfig.textClass}`} />
                <span className={`text-sm font-medium ${statusConfig.textClass}`}>
                  {statusConfig.label}
                </span>
              </div>
              
              {/* Price */}
              <div className="text-center">
                <span className="text-2xl font-bold text-foreground">
                  ${Number(booking.total_price).toFixed(0)}
                </span>
                <p className="text-xs text-muted-foreground">por sesión</p>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                {showReview && booking.status === 'completed' && !booking.hasReview && (
                  <Button
                    size="sm"
                    onClick={() => openReviewModal(booking)}
                    className="gap-1.5"
                  >
                    <Star className="w-4 h-4" />
                    Dejar Reseña
                  </Button>
                )}
                {showReview && booking.hasReview && (
                  <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    Reseñado
                  </Badge>
                )}
                {showCancel && booking.status !== 'cancelled' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => cancelBooking(booking.id)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ 
    icon: Icon, 
    title, 
    description,
    actionLabel,
    onAction
  }: { 
    icon: React.ElementType; 
    title: string; 
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => (
    <Card className="border-dashed">
      <CardContent className="py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-sm mx-auto mb-6">
          {description}
        </p>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="gap-2">
            {actionLabel}
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-40 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-64 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </div>
              <div className="p-5 md:w-56 bg-muted/30 flex md:flex-col items-center justify-between gap-3">
                <div className="h-8 w-28 bg-muted animate-pulse rounded-full" />
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                <div className="h-8 w-24 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Stats summary
  const stats = [
    { label: 'Próximas', value: upcomingBookings.length, color: 'text-primary' },
    { label: 'Completadas', value: pastBookings.filter(b => b.status === 'completed').length, color: 'text-emerald-600' },
    { label: 'Canceladas', value: cancelledBookings.length, color: 'text-destructive' },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* Header with stats */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Mis Reservas</h1>
              <p className="text-muted-foreground mt-1">
                Gestiona tus sesiones de entrenamiento
              </p>
            </div>
            <Button 
              onClick={() => navigate('/browse')}
              className="gap-2 w-fit"
            >
              Buscar Profesores
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="text-center py-4">
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full md:w-auto grid grid-cols-3 mb-6 bg-muted/50">
            <TabsTrigger value="upcoming" className="gap-2">
              <Timer className="w-4 h-4" />
              <span className="hidden sm:inline">Próximas</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {upcomingBookings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Pasadas</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {pastBookings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-2">
              <XCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Canceladas</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {cancelledBookings.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-0">
            {loading ? (
              <LoadingSkeleton />
            ) : upcomingBookings.length === 0 ? (
              <EmptyState 
                icon={Calendar}
                title="No hay reservas próximas"
                description="Explora nuestro catálogo de profesores expertos y reserva tu primera sesión de entrenamiento."
                actionLabel="Explorar Profesores"
                onAction={() => navigate('/browse')}
              />
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} showCancel />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-0">
            {pastBookings.length === 0 ? (
              <EmptyState 
                icon={Clock}
                title="No hay sesiones pasadas"
                description="Cuando completes tus sesiones de entrenamiento, aparecerán aquí para que puedas dejar reseñas."
              />
            ) : (
              <div className="space-y-4">
                {pastBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} showReview />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-0">
            {cancelledBookings.length === 0 ? (
              <EmptyState 
                icon={XCircle}
                title="No hay reservas canceladas"
                description="Las sesiones que canceles aparecerán aquí como historial."
              />
            ) : (
              <div className="space-y-4">
                {cancelledBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Modal */}
      {reviewModal.booking && profile && (
        <ReviewModal
          open={reviewModal.open}
          onOpenChange={(open) => setReviewModal({ ...reviewModal, open })}
          bookingId={reviewModal.booking.id}
          teacherId={reviewModal.booking.teacher_id}
          studentId={profile.id}
          teacherName={reviewModal.booking.teacher?.full_name || 'Profesor'}
          onReviewSubmitted={fetchBookings}
        />
      )}
    </DashboardLayout>
  );
}
