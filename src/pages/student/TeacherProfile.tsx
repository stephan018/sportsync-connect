import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Availability, DAYS_OF_WEEK } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TeacherReviews from '@/components/reviews/TeacherReviews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Dumbbell,
  Loader2,
  MessageSquare,
  Star,
} from 'lucide-react';

interface TeacherWithStats extends Profile {
  avgRating: number;
  reviewCount: number;
}

export default function TeacherProfile() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { getOrCreateChatRoom } = useChat();

  const [teacher, setTeacher] = useState<TeacherWithStats | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teacherId) {
      fetchTeacherData();
    }
  }, [teacherId]);

  const fetchTeacherData = async () => {
    try {
      // Fetch teacher profile
      const { data: teacherData, error: teacherError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', teacherId)
        .maybeSingle();

      if (teacherError) throw teacherError;
      if (!teacherData) {
        setLoading(false);
        return;
      }

      // Fetch availability
      const { data: availData, error: availError } = await supabase
        .from('availability')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('is_available', true)
        .order('day_of_week', { ascending: true });

      if (availError) throw availError;
      setAvailability(availData as Availability[]);

      // Fetch reviews for rating
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('teacher_id', teacherId);

      if (reviewsError) throw reviewsError;

      const reviewCount = reviewsData?.length || 0;
      const avgRating =
        reviewCount > 0
          ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0;

      setTeacher({
        ...(teacherData as Profile),
        avgRating,
        reviewCount,
      });
    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!profile || !teacherId) return;
    const roomId = await getOrCreateChatRoom(teacherId, profile.id);
    if (roomId) {
      navigate('/messages');
    }
  };

  // Group availability by day
  const availabilityByDay = DAYS_OF_WEEK.map((day) => ({
    ...day,
    slots: availability.filter((a) => a.day_of_week === day.value),
  }));

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
          <p className="text-muted-foreground">Teacher not found</p>
          <Button onClick={() => navigate('/browse')} className="mt-4">
            Back to Browse
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
          Back to Teachers
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Teacher Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-4xl font-bold text-primary-foreground shrink-0">
                    {teacher.full_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h1 className="text-3xl font-bold">{teacher.full_name}</h1>
                        <div className="flex items-center gap-3 mt-2">
                          {teacher.sport && (
                            <Badge variant="secondary" className="gap-1">
                              <Dumbbell className="w-3 h-3" />
                              {teacher.sport}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 text-sm">
                            <Star
                              className={`w-4 h-4 ${
                                teacher.avgRating > 0
                                  ? 'text-warning fill-warning'
                                  : 'text-muted-foreground'
                              }`}
                            />
                            <span className="font-medium">
                              {teacher.avgRating > 0 ? teacher.avgRating.toFixed(1) : 'New'}
                            </span>
                            {teacher.reviewCount > 0 && (
                              <span className="text-muted-foreground">
                                ({teacher.reviewCount} reviews)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className="gradient-primary text-lg px-4 py-2">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {Number(teacher.hourly_rate)}/hour
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-4">
                      {teacher.bio ||
                        'Professional sports coach ready to help you achieve your fitness goals.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Info & Reviews */}
            <Tabs defaultValue="reviews" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="reviews">
                  Reviews ({teacher.reviewCount})
                </TabsTrigger>
                <TabsTrigger value="availability">Availability</TabsTrigger>
              </TabsList>

              <TabsContent value="reviews">
                <TeacherReviews teacherId={teacher.id} />
              </TabsContent>

              <TabsContent value="availability">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Weekly Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {availabilityByDay.map((day) => (
                        <div
                          key={day.value}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <span className="font-medium w-28">{day.label}</span>
                          {day.slots.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {day.slots.map((slot) => (
                                <Badge key={slot.id} variant="secondary">
                                  {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not available</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-4">
            <Card className="sticky top-8">
              <CardContent className="p-6 space-y-4">
                <Button
                  className="w-full gradient-primary"
                  size="lg"
                  onClick={() => navigate(`/book/${teacher.id}`)}
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Book Sessions
                </Button>
                <Button variant="outline" className="w-full" size="lg" onClick={handleMessage}>
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Send Message
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
