import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Search, 
  Star, 
  Users, 
  Dumbbell,
  Trophy,
  Target,
  Bike,
  Waves,
  Mountain,
  Swords,
  Heart,
  Footprints,
  SlidersHorizontal,
  Grid3X3
} from 'lucide-react';

interface TeacherWithRating extends Profile {
  avgRating: number;
  reviewCount: number;
}

// Sport categories with icons
const SPORT_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: Grid3X3 },
  { id: 'Fútbol', label: 'Fútbol', icon: Trophy },
  { id: 'Tenis', label: 'Tenis', icon: Target },
  { id: 'Natación', label: 'Natación', icon: Waves },
  { id: 'Ciclismo', label: 'Ciclismo', icon: Bike },
  { id: 'Yoga', label: 'Yoga', icon: Heart },
  { id: 'Crossfit', label: 'Crossfit', icon: Dumbbell },
  { id: 'Running', label: 'Running', icon: Footprints },
  { id: 'Escalada', label: 'Escalada', icon: Mountain },
  { id: 'Artes Marciales', label: 'Artes Marciales', icon: Swords },
];

// Placeholder images for teachers (sports themed)
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop',
];

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
      const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .order('created_at', { ascending: false });

      if (teachersError) throw teachersError;

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('teacher_id, rating');

      if (reviewsError) throw reviewsError;

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

  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.sport?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSport = sportFilter === 'all' || teacher.sport === sportFilter;

    return matchesSearch && matchesSport;
  });

  // Get image for teacher (use avatar or placeholder)
  const getTeacherImage = (teacher: TeacherWithRating, index: number) => {
    return teacher.avatar_url || PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        {/* Hero Search Section */}
        <div className="bg-gradient-to-b from-muted/50 to-background px-4 pt-6 pb-4">
          <div className="max-w-4xl mx-auto">
            {/* Search Bar */}
            <div className="bg-card rounded-full shadow-lg border border-border/50 p-2 flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar profesores, deportes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-12 text-base"
                />
              </div>
              <Button className="rounded-full h-12 px-8 gradient-primary text-primary-foreground font-semibold">
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-4 py-4 border-b border-border/50">
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2 max-w-6xl mx-auto">
              {SPORT_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isActive = sportFilter === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSportFilter(category.id)}
                    className={`
                      flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl transition-all duration-200 whitespace-nowrap min-w-[80px]
                      ${isActive 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{category.label}</span>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Results Header */}
        <div className="px-4 py-4 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {sportFilter === 'all' ? 'Todos los profesores' : sportFilter}
              </h2>
              <p className="text-sm text-muted-foreground">
                {filteredTeachers.length} profesor{filteredTeachers.length !== 1 ? 'es' : ''} disponible{filteredTeachers.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button variant="outline" className="rounded-full gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
            </Button>
          </div>
        </div>

        {/* Teachers Grid */}
        <div className="px-4 pb-8 max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] bg-muted rounded-2xl mb-3" />
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">No se encontraron profesores</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Intenta ajustar tu búsqueda o explora otras categorías de deportes
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeachers.map((teacher, index) => (
                <article
                  key={teacher.id}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/teacher/${teacher.id}`)}
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3">
                    <img
                      src={getTeacherImage(teacher, index)}
                      alt={teacher.full_name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
                      }}
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Sport Badge */}
                    {teacher.sport && (
                      <Badge 
                        variant="secondary" 
                        className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm text-foreground border-0 font-medium"
                      >
                        {teacher.sport}
                      </Badge>
                    )}

                    {/* Quick Book Button - appears on hover */}
                    <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <Button 
                        className="w-full gradient-primary text-primary-foreground font-semibold shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/book/${teacher.id}`);
                        }}
                      >
                        Reservar Sesión
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {teacher.full_name}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className={`w-4 h-4 ${teacher.avgRating > 0 ? 'text-warning fill-warning' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-medium">
                          {teacher.avgRating > 0 ? teacher.avgRating.toFixed(1) : 'Nuevo'}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {teacher.bio || 'Profesor profesional de deportes'}
                    </p>
                    
                    <p className="text-foreground font-semibold">
                      desde <span className="text-lg">${teacher.hourly_rate}</span>
                      <span className="text-sm font-normal text-muted-foreground"> /sesión</span>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
