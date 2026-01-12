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
import ReviewModal from '@/components/reviews/ReviewModal';
import { Calendar, Clock, Star, X } from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';
import { toast } from 'sonner';

interface BookingWithTeacher extends Booking {
  teacher: Profile;
  hasReview?: boolean;
}

export default function MyBookings() {
  const { profile } = useAuth();
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
      // Fetch bookings
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

      // Fetch reviews to check which bookings have been reviewed
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
      
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-primary';
      case 'pending':
        return 'bg-warning';
      case 'completed':
        return 'bg-success';
      case 'cancelled':
        return 'bg-destructive';
      default:
        return 'bg-muted';
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
  }) => (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground">
              {booking.teacher?.full_name?.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold">{booking.teacher?.full_name}</h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(parseISO(booking.booking_date), 'EEE, MMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
            <span className="font-semibold text-primary">
              ${Number(booking.total_price).toFixed(0)}
            </span>
            {showReview && booking.status === 'completed' && !booking.hasReview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openReviewModal(booking)}
              >
                <Star className="w-4 h-4 mr-1" />
                Review
              </Button>
            )}
            {showReview && booking.hasReview && (
              <Badge variant="secondary" className="gap-1">
                <Star className="w-3 h-3 fill-warning text-warning" />
                Reviewed
              </Badge>
            )}
            {showCancel && booking.status !== 'cancelled' && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => cancelBooking(booking.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Bookings</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your scheduled sessions
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({cancelledBookings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No upcoming bookings</h3>
                  <p className="text-muted-foreground">
                    Browse teachers to book your first session
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} showCancel />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No past sessions</h3>
                  <p className="text-muted-foreground">
                    Your completed sessions will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pastBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} showReview />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled">
            {cancelledBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <X className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No cancelled bookings</h3>
                  <p className="text-muted-foreground">Cancelled sessions will appear here</p>
                </CardContent>
              </Card>
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
          teacherName={reviewModal.booking.teacher?.full_name || 'Teacher'}
          onReviewSubmitted={fetchBookings}
        />
      )}
    </DashboardLayout>
  );
}
