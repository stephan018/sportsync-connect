import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Availability } from '@/types/database';
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
  MapPin,
  MessageSquare,
  Star,
  Trophy,
  Users,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const DAYS_OF_WEEK_ES = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

// Sport-specific hero images
const SPORT_HERO_IMAGES: Record<string, string> = {
  'Tenis': 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=1200&h=400&fit=crop',
  'Fútbol': 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&h=400&fit=crop',
  'Baloncesto': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=400&fit=crop',
  'Natación': 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1200&h=400&fit=crop',
  'Yoga': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&h=400&fit=crop',
  'Golf': 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200&h=400&fit=crop',
  'Boxeo': 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&h=400&fit=crop',
  'Padel': 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&h=400&fit=crop',
  'Running': 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&h=400&fit=crop',
  'Crossfit': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=400&fit=crop',
};

const GALLERY_IMAGES: Record<string, string[]> = {
  'Tenis': [
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1551773148-7c9b1f8b1a1c?w=400&h=300&fit=crop',
  ],
  'Fútbol': [
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=300&fit=crop',
  ],
  'default': [
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=300&fit=crop',
  ],
};

const DEFAULT_HERO = 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=400&fit=crop';

interface TeacherWithStats extends Profile {
  avgRating: number;
  reviewCount: number;
  completedSessions: number;
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

      // Fetch completed sessions count
      const { count: sessionsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', teacherId)
        .eq('status', 'completed');

      const reviewCount = reviewsData?.length || 0;
      const avgRating =
        reviewCount > 0
          ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0;

      setTeacher({
        ...(teacherData as Profile),
        avgRating,
        reviewCount,
        completedSessions: sessionsCount || 0,
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
  const availabilityByDay = DAYS_OF_WEEK_ES.map((day) => ({
    ...day,
    slots: availability.filter((a) => a.day_of_week === day.value),
  }));

  const heroImage = teacher?.sport
    ? SPORT_HERO_IMAGES[teacher.sport] || DEFAULT_HERO
    : DEFAULT_HERO;

  const galleryImages = teacher?.sport
    ? GALLERY_IMAGES[teacher.sport] || GALLERY_IMAGES['default']
    : GALLERY_IMAGES['default'];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="h-72 bg-muted" />
          <div className="max-w-6xl mx-auto px-6 -mt-20">
            <div className="flex gap-6">
              <div className="w-36 h-36 rounded-2xl bg-muted border-4 border-background" />
              <div className="flex-1 pt-24 space-y-3">
                <div className="h-8 bg-muted rounded w-64" />
                <div className="h-4 bg-muted rounded w-48" />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!teacher) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Profesor no encontrado</h2>
          <p className="text-muted-foreground mb-6">
            El perfil que buscas no existe o ha sido eliminado
          </p>
          <Button onClick={() => navigate('/browse')} className="gradient-primary">
            Explorar Profesores
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative h-72 md:h-80 overflow-hidden">
          <img
            src={heroImage}
            alt={`${teacher.sport || 'Deporte'} training`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/browse')}
            className="absolute top-6 left-6 bg-background/80 backdrop-blur-sm hover:bg-background"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>

          {/* Sport Badge */}
          {teacher.sport && (
            <Badge className="absolute top-6 right-6 bg-primary/90 backdrop-blur-sm text-primary-foreground px-4 py-2 text-sm">
              <Trophy className="w-4 h-4 mr-2" />
              {teacher.sport}
            </Badge>
          )}
        </div>

        {/* Profile Content */}
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          {/* Profile Header */}
          <div className="relative -mt-20 mb-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="w-32 h-32 md:w-36 md:h-36 rounded-2xl gradient-primary flex items-center justify-center text-5xl md:text-6xl font-bold text-primary-foreground border-4 border-background shadow-xl shrink-0">
                {teacher.full_name.charAt(0)}
              </div>

              {/* Info */}
              <div className="flex-1 pt-0 md:pt-20">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl md:text-3xl font-bold">{teacher.full_name}</h1>
                      <Badge variant="outline" className="gap-1 text-primary border-primary">
                        <CheckCircle2 className="w-3 h-3" />
                        Verificado
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      {/* Rating */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= Math.round(teacher.avgRating)
                                  ? 'text-warning fill-warning'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-semibold">
                          {teacher.avgRating > 0 ? teacher.avgRating.toFixed(1) : 'Nuevo'}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          ({teacher.reviewCount} reseñas)
                        </span>
                      </div>

                      {/* Sessions */}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{teacher.completedSessions} sesiones</span>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-4 py-3">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold text-primary">
                      {Number(teacher.hourly_rate)}
                    </span>
                    <span className="text-muted-foreground">/hora</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 pb-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Bio Section */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Sobre Mí
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-muted-foreground leading-relaxed">
                    {teacher.bio ||
                      'Entrenador deportivo profesional con años de experiencia. Mi metodología se enfoca en el progreso individual de cada alumno, adaptando los entrenamientos a sus necesidades y objetivos específicos. ¡Juntos alcanzaremos tus metas!'}
                  </p>
                </CardContent>
              </Card>

              {/* Gallery */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Galería de Entrenamiento
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {galleryImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="aspect-[4/3] rounded-xl overflow-hidden group cursor-pointer"
                    >
                      <img
                        src={img}
                        alt={`Training ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs for Reviews & Availability */}
              <Tabs defaultValue="reviews" className="w-full">
                <TabsList className="w-full grid grid-cols-2 h-12">
                  <TabsTrigger value="reviews" className="text-sm">
                    <Star className="w-4 h-4 mr-2" />
                    Reseñas ({teacher.reviewCount})
                  </TabsTrigger>
                  <TabsTrigger value="availability" className="text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    Disponibilidad
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reviews" className="mt-6">
                  <TeacherReviews teacherId={teacher.id} />
                </TabsContent>

                <TabsContent value="availability" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Calendar className="w-5 h-5 text-primary" />
                        Horario Semanal
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-7 gap-2">
                        {availabilityByDay.map((day) => (
                          <div
                            key={day.value}
                            className={`text-center p-3 rounded-xl transition-colors ${
                              day.slots.length > 0
                                ? 'bg-primary/10 border border-primary/20'
                                : 'bg-muted/50'
                            }`}
                          >
                            <span
                              className={`text-xs font-medium ${
                                day.slots.length > 0 ? 'text-primary' : 'text-muted-foreground'
                              }`}
                            >
                              {day.short}
                            </span>
                            <div className="mt-2 space-y-1">
                              {day.slots.length > 0 ? (
                                day.slots.map((slot) => (
                                  <div
                                    key={slot.id}
                                    className="text-[10px] text-muted-foreground bg-background rounded px-1 py-0.5"
                                  >
                                    {slot.start_time.slice(0, 5)}
                                  </div>
                                ))
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </div>
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
              <Card className="sticky top-8 overflow-hidden border-primary/20">
                <div className="h-2 gradient-primary" />
                <CardContent className="p-6 space-y-4">
                  <div className="text-center pb-4 border-b">
                    <p className="text-sm text-muted-foreground mb-1">Precio por sesión</p>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-3xl font-bold text-primary">
                        ${Number(teacher.hourly_rate)}
                      </span>
                      <span className="text-muted-foreground">/hora</span>
                    </div>
                  </div>

                  <Button
                    className="w-full gradient-primary h-12 text-base font-semibold"
                    onClick={() => navigate(`/book/${teacher.id}`)}
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Reservar Sesión
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-12"
                    onClick={handleMessage}
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Enviar Mensaje
                  </Button>

                  <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>Respuesta rápida</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>Cancelación flexible</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>Perfil verificado</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
