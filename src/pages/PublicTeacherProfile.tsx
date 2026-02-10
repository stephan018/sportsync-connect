import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Availability } from '@/types/database';
import { format, addDays, getDay } from 'date-fns';
import TeacherReviews from '@/components/reviews/TeacherReviews';
import WeeklyScheduleView from '@/components/availability/WeeklyScheduleView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  Calendar,
  Clock,
  DollarSign,
  Star,
  Trophy,
  Users,
  CheckCircle2,
  Sparkles,
  Share2,
  Dumbbell,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
const DEFAULT_HERO = 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=400&fit=crop';

export default function PublicTeacherProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teacher, setTeacher] = useState<Profile & { completedSessions: number } | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) fetchTeacher();
  }, [slug]);

  // Set OG meta tags dynamically for client-side rendering
  useEffect(() => {
    if (!teacher) return;
    document.title = `${teacher.full_name} - Profesor de ${teacher.sport || 'Deportes'} | ProffX`;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('og:title', `${teacher.full_name} - Profesor de ${teacher.sport || 'Deportes'}`);
    setMeta('og:description', teacher.bio || `Reserva clases con ${teacher.full_name} en ProffX`);
    setMeta('og:image', teacher.avatar_url || DEFAULT_HERO);
    setMeta('og:url', window.location.href);
    setMeta('og:type', 'profile');

    return () => { document.title = 'ProffX'; };
  }, [teacher]);

  const fetchTeacher = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('slug', slug)
        .eq('role', 'teacher')
        .maybeSingle();

      if (error) throw error;
      if (!data) { setLoading(false); return; }

      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', data.id)
        .eq('status', 'completed');

      const { data: availData } = await supabase
        .from('availability')
        .select('*')
        .eq('teacher_id', data.id)
        .eq('is_available', true)
        .order('day_of_week', { ascending: true });

      setAvailability((availData || []) as Availability[]);
      setTeacher({ ...(data as Profile), completedSessions: count || 0 });
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `${teacher?.full_name} en ProffX`, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: '¡Enlace copiado!' });
    }
  };

  const heroImage = teacher?.sport ? SPORT_HERO_IMAGES[teacher.sport] || DEFAULT_HERO : DEFAULT_HERO;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-72 w-full" />
        <div className="max-w-4xl mx-auto px-4 -mt-16 space-y-4">
          <Skeleton className="w-32 h-32 rounded-2xl" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Users className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Profesor no encontrado</h2>
        <p className="text-muted-foreground mb-6">El perfil que buscas no existe</p>
        <Button onClick={() => navigate('/')} className="gradient-primary">
          Ir al Inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">ProffX</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1.5" />
              Compartir
            </Button>
            <Button size="sm" className="gradient-primary" asChild>
              <Link to="/auth">Registrarse</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        <OptimizedImage src={heroImage} alt={teacher.sport || 'Deporte'} className="h-56 md:h-72" imgClassName="w-full h-full" showSkeleton />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        {teacher.sport && (
          <Badge className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm text-primary-foreground px-3 py-1.5">
            <Trophy className="w-3.5 h-3.5 mr-1.5" />
            {teacher.sport}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-28">
        {/* Profile header */}
        <div className="relative -mt-16 mb-8">
          <div className="flex flex-col md:flex-row gap-5">
            {teacher.avatar_url ? (
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 border-background shadow-xl shrink-0">
                <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl gradient-primary flex items-center justify-center text-4xl font-bold text-primary-foreground border-4 border-background shadow-xl shrink-0">
                {teacher.full_name.charAt(0)}
              </div>
            )}
            <div className="flex-1 pt-0 md:pt-16">
              <h1 className="text-2xl md:text-3xl font-bold">{teacher.full_name}</h1>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(Number(teacher.average_rating)) ? 'text-warning fill-warning' : 'text-muted-foreground/30'}`} />
                  ))}
                  <span className="font-semibold ml-1">{Number(teacher.average_rating) > 0 ? Number(teacher.average_rating).toFixed(1) : 'Nuevo'}</span>
                  <span className="text-muted-foreground text-sm">({teacher.total_reviews})</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <Users className="w-4 h-4" />
                  {teacher.completedSessions} sesiones
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-4 py-3 self-start">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold text-primary">{Number(teacher.hourly_rate)}</span>
              <span className="text-muted-foreground">/hora</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <Card className="mb-6">
          <CardHeader className="bg-muted/30 p-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-primary" />
              Sobre Mí
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-muted-foreground leading-relaxed">
              {teacher.bio || 'Entrenador deportivo profesional con años de experiencia.'}
            </p>
          </CardContent>
        </Card>

        {/* Reviews & Availability */}
        <Tabs defaultValue="reviews" className="mb-6">
          <TabsList className="w-full grid grid-cols-2 h-11">
            <TabsTrigger value="reviews">
              <Star className="w-4 h-4 mr-1.5" />
              Reseñas ({teacher.total_reviews})
            </TabsTrigger>
            <TabsTrigger value="availability">
              <Clock className="w-4 h-4 mr-1.5" />
              Disponibilidad
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reviews" className="mt-4">
            <TeacherReviews teacherId={teacher.id} />
          </TabsContent>
          <TabsContent value="availability" className="mt-4">
            <WeeklyScheduleView availability={availability} isSlotBooked={() => false} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-bottom z-50">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Desde</p>
            <p className="text-xl font-bold text-primary">${Number(teacher.hourly_rate)}<span className="text-sm font-normal text-muted-foreground">/h</span></p>
          </div>
          <Button className="gradient-primary h-12 px-6 font-semibold" asChild>
            <Link to="/auth">
              <Calendar className="w-5 h-5 mr-2" />
              Reservar Clase
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
