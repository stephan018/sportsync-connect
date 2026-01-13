import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReviewWithStudent } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Star, ThumbsUp, Quote } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface TeacherReviewsProps {
  teacherId: string;
}

interface RatingBreakdown {
  rating: number;
  count: number;
  percentage: number;
}

export default function TeacherReviews({ teacherId }: TeacherReviewsProps) {
  const [reviews, setReviews] = useState<ReviewWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ average: 0, count: 0 });
  const [breakdown, setBreakdown] = useState<RatingBreakdown[]>([]);

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

      // Calculate stats and breakdown
      if (reviewsData.length > 0) {
        const avg =
          reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
        setStats({ average: avg, count: reviewsData.length });

        // Calculate rating breakdown
        const ratingCounts = [5, 4, 3, 2, 1].map((rating) => {
          const count = reviewsData.filter((r) => r.rating === rating).length;
          return {
            rating,
            count,
            percentage: (count / reviewsData.length) * 100,
          };
        });
        setBreakdown(ratingCounts);
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
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        {[1, 2].map((i) => (
          <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">Aún no hay reseñas</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Sé el primero en dejar una reseña después de completar una sesión con este profesor
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2">
            {/* Left: Big Rating */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 flex flex-col items-center justify-center text-center">
              <div className="text-5xl font-bold text-primary mb-2">
                {stats.average.toFixed(1)}
              </div>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(stats.average)
                        ? 'text-warning fill-warning'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Basado en {stats.count} reseña{stats.count !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Right: Breakdown */}
            <div className="p-6 space-y-3">
              {breakdown.map((item) => (
                <div key={item.rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12 shrink-0">
                    <span className="text-sm font-medium">{item.rating}</span>
                    <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                  </div>
                  <Progress value={item.percentage} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review, index) => (
          <Card
            key={review.id}
            className={`overflow-hidden transition-all hover:shadow-md ${
              index === 0 ? 'border-primary/30 bg-primary/5' : ''
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-lg shrink-0">
                  {review.student?.full_name?.charAt(0) || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold">{review.student?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(review.created_at), "d 'de' MMMM, yyyy", {
                          locale: es,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-muted rounded-full px-2.5 py-1">
                      <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                      <span className="text-sm font-semibold">{review.rating}</span>
                    </div>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <div className="relative">
                      <Quote className="w-4 h-4 text-primary/30 absolute -left-1 -top-1" />
                      <p className="text-sm text-muted-foreground pl-4 leading-relaxed">
                        {review.comment}
                      </p>
                    </div>
                  )}

                  {/* Helpful badge for first review */}
                  {index === 0 && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-primary">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Reseña más reciente</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
