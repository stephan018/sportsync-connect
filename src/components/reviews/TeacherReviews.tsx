import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReviewWithStudent } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface TeacherReviewsProps {
  teacherId: string;
}

export default function TeacherReviews({ teacherId }: TeacherReviewsProps) {
  const [reviews, setReviews] = useState<ReviewWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ average: 0, count: 0 });

  useEffect(() => {
    fetchReviews();
  }, [teacherId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          student:profiles!reviews_student_id_fkey(id, full_name, avatar_url)
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reviewsData = data as unknown as ReviewWithStudent[];
      setReviews(reviewsData);

      // Calculate stats
      if (reviewsData.length > 0) {
        const avg =
          reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
        setStats({ average: avg, count: reviewsData.length });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aún no hay reseñas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-5 h-5 ${
                star <= Math.round(stats.average)
                  ? 'text-warning fill-warning'
                  : 'text-muted-foreground'
              }`}
            />
          ))}
        </div>
        <span className="font-semibold">{stats.average.toFixed(1)}</span>
        <span className="text-muted-foreground">({stats.count} reseñas)</span>
      </div>

      {/* Reviews List */}
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {review.student?.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-medium">{review.student?.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(review.created_at), "d 'de' MMM yyyy", { locale: es })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= review.rating
                        ? 'text-warning fill-warning'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
            </div>
            {review.comment && (
              <p className="text-sm text-muted-foreground mt-2">
                {review.comment}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
