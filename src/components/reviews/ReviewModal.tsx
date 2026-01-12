import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  teacherId: string;
  studentId: string;
  teacherName: string;
  onReviewSubmitted: () => void;
}

export default function ReviewModal({
  open,
  onOpenChange,
  bookingId,
  teacherId,
  studentId,
  teacherName,
  onReviewSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        booking_id: bookingId,
        teacher_id: teacherId,
        student_id: studentId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      toast.success('Review submitted successfully!');
      onReviewSubmitted();
      onOpenChange(false);
      setRating(0);
      setComment('');
    } catch (error: any) {
      console.error('Error submitting review:', error);
      if (error.code === '23505') {
        toast.error('You have already reviewed this session');
      } else {
        toast.error('Failed to submit review');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Session</DialogTitle>
          <DialogDescription>
            How was your session with {teacherName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
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
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={loading || rating === 0}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
