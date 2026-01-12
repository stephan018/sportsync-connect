import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Star, DollarSign, Calendar, Users, MessageSquare, Dumbbell } from 'lucide-react';

interface TeacherWithRating extends Profile {
  avgRating: number;
  reviewCount: number;
}

export default function BrowseTeachers() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { getOrCreateChatRoom } = useChat();
  const [teachers, setTeachers] = useState<TeacherWithRating[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const handleMessageTeacher = async (teacherId: string) => {
    if (!profile) return;
    const roomId = await getOrCreateChatRoom(teacherId, profile.id);
    if (roomId) {
      navigate('/messages');
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .order('created_at', { ascending: false });

      if (teachersError) throw teachersError;

      // Fetch all reviews to calculate averages
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('teacher_id, rating');

      if (reviewsError) throw reviewsError;

      // Calculate average ratings per teacher
      const ratingsByTeacher: Record<string, { total: number; count: number }> = {};
      reviewsData?.forEach((review) => {
        if (!ratingsByTeacher[review.teacher_id]) {
          ratingsByTeacher[review.teacher_id] = { total: 0, count: 0 };
        }
        ratingsByTeacher[review.teacher_id].total += review.rating;
        ratingsByTeacher[review.teacher_id].count += 1;
      });

      const teachersWithRatings: TeacherWithRating[] = (teachersData as Profile[]).map(
        (teacher) => {
          const stats = ratingsByTeacher[teacher.id];
          return {
            ...teacher,
            avgRating: stats ? stats.total / stats.count : 0,
            reviewCount: stats?.count || 0,
          };
        }
      );

      setTeachers(teachersWithRatings);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique sports from teachers for filter dropdown
  const availableSports = useMemo(() => {
    const sports = teachers.map((t) => t.sport).filter((s): s is string => !!s);
    return [...new Set(sports)].sort();
  }, [teachers]);

  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.sport?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSport = sportFilter === 'all' || teacher.sport === sportFilter;

    return matchesSearch && matchesSport;
  });

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Find Your Coach</h1>
          <p className="text-muted-foreground mt-1">
            Browse and book sessions with professional sports teachers
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, sport or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg"
            />
          </div>
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-full sm:w-48 h-12">
              <Dumbbell className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Sports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              {availableSports.map((sport) => (
                <SelectItem key={sport} value={sport}>
                  {sport}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Teachers Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No teachers found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or check back later
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeachers.map((teacher) => (
              <Card key={teacher.id} className="card-hover overflow-hidden">
                <CardContent className="p-0">
                  {/* Avatar/Header */}
                  <div className="h-32 gradient-primary relative">
                    <div className="absolute -bottom-8 left-6">
                      <div className="w-16 h-16 rounded-full bg-background border-4 border-background flex items-center justify-center text-2xl font-bold text-primary">
                        {teacher.full_name.charAt(0)}
                      </div>
                    </div>
                    {teacher.sport && (
                      <Badge className="absolute top-4 right-4 bg-background/90 text-foreground hover:bg-background">
                        <Dumbbell className="w-3 h-3 mr-1" />
                        {teacher.sport}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="pt-12 px-6 pb-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{teacher.full_name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star
                            className={`w-4 h-4 ${
                              teacher.avgRating > 0
                                ? 'text-warning fill-warning'
                                : 'text-muted-foreground'
                            }`}
                          />
                          <span>
                            {teacher.avgRating > 0 ? teacher.avgRating.toFixed(1) : 'New'}
                          </span>
                          {teacher.reviewCount > 0 && (
                            <>
                              <span className="mx-1">•</span>
                              <span>
                                {teacher.reviewCount} review{teacher.reviewCount !== 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {Number(teacher.hourly_rate)}/hr
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {teacher.bio ||
                        'Professional sports coach ready to help you achieve your fitness goals.'}
                    </p>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 gradient-primary"
                        onClick={() => navigate(`/book/${teacher.id}`)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Book
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleMessageTeacher(teacher.id)}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
