import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PendingReviewBooking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  teacher_id: string;
  teacher_name: string;
  teacher_avatar: string | null;
  teacher_sport: string | null;
}

const SNOOZE_KEY = 'review_snoozed_bookings';

function getSnoozedBookings(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SNOOZE_KEY) || '{}');
  } catch {
    return {};
  }
}

function snoozeBooking(bookingId: string) {
  const snoozed = getSnoozedBookings();
  // Snooze for 7 days
  snoozed[bookingId] = Date.now() + 7 * 24 * 60 * 60 * 1000;
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(snoozed));
}

function isBookingSnoozed(bookingId: string): boolean {
  const snoozed = getSnoozedBookings();
  const expiry = snoozed[bookingId];
  if (!expiry) return false;
  if (Date.now() > expiry) {
    // Expired snooze, clean up
    delete snoozed[bookingId];
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(snoozed));
    return false;
  }
  return true;
}

export default function ReviewPromptModal() {
  const { profile } = useAuth();
  const [pendingBooking, setPendingBooking] = useState<PendingReviewBooking | null>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const checkForPendingReviews = useCallback(async () => {
    if (!profile?.id || profile.role !== 'student') return;

    try {
      // Get completed bookings
      const { data: completedBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id, booking_date, start_time, end_time, teacher_id,
          teacher:profiles!bookings_teacher_id_fkey(full_name, avatar_url, sport)
        `)
        .eq('student_id', profile.id)
        .eq('status', 'completed')
        .order('booking_date', { ascending: false })
        .limit(10);

      if (bookingsError) throw bookingsError;
      if (!completedBookings?.length) return;

      // Get existing reviews for these bookings
      const bookingIds = completedBookings.map((b) => b.id);
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('booking_id')
        .in('booking_id', bookingIds);

      if (reviewsError) throw reviewsError;

      const reviewedIds = new Set(reviews?.map((r) => r.booking_id));

      // Find first unreviewd, unsnoozed booking
      const pending = completedBookings.find(
        (b) => !reviewedIds.has(b.id) && !isBookingSnoozed(b.id)
      );

      if (pending) {
        const teacher = pending.teacher as any;
        setPendingBooking({
          id: pending.id,
          booking_date: pending.booking_date,
          start_time: pending.start_time,
          end_time: pending.end_time,
          teacher_id: pending.teacher_id,
          teacher_name: teacher?.full_name || 'tu profesor',
          teacher_avatar: teacher?.avatar_url || null,
          teacher_sport: teacher?.sport || null,
        });
        setOpen(true);
      }
    } catch (error) {
      console.error('Error checking pending reviews:', error);
    }
  }, [profile?.id, profile?.role]);

  useEffect(() => {
    // Delay slightly so it doesn't flash on page load
    const timer = setTimeout(checkForPendingReviews, 2000);
    return () => clearTimeout(timer);
  }, [checkForPendingReviews]);

  const handleDismiss = () => {
    if (pendingBooking) {
      snoozeBooking(pendingBooking.id);
    }
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setRating(0);
    setHoveredRating(0);
    setComment('');
  };

  const handleSubmit = async () => {
    if (!pendingBooking || !profile?.id || rating === 0) {
      if (rating === 0) toast.error('Por favor selecciona una calificación');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        booking_id: pendingBooking.id,
        teacher_id: pendingBooking.teacher_id,
        student_id: profile.id,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      toast.success('¡Reseña enviada exitosamente!');
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      if (error.code === '23505') {
        toast.error('Ya has reseñado esta sesión');
        setOpen(false);
      } else {
        toast.error('Error al enviar la reseña');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!pendingBooking) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Qué tal estuvo tu clase con {pendingBooking.teacher_name}?</DialogTitle>
          <DialogDescription>
            Tu opinión ayuda a otros estudiantes a encontrar al mejor profesor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Calificación</Label>
            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 transition-transform hover:scale-110"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={cn(
                      'w-8 h-8 transition-colors',
                      (hoveredRating || rating) >= star
                        ? 'text-warning fill-warning'
                        : 'text-muted-foreground'
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {rating === 1 && 'Malo'}
              {rating === 2 && 'Regular'}
              {rating === 3 && 'Bueno'}
              {rating === 4 && 'Muy Bueno'}
              {rating === 5 && 'Excelente'}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="review-comment">Comentario (opcional)</Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comparte tu experiencia..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={handleDismiss}
          >
            Ahora no
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={loading || rating === 0}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Reseña'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
