import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import AcexLogo from '@/components/brand/AcexLogo';
import { Helmet } from 'react-helmet-async';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  Star,
  Clock,
  DollarSign
} from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && profile) {
      navigate(profile.role === 'teacher' ? '/dashboard' : '/browse');
    }
  }, [user, profile, loading, navigate]);

  const features = [
    {
      icon: Calendar,
      title: 'Reservas Recurrentes',
      description: 'Reserva sesiones semanales por meses con un solo clic.',
    },
    {
      icon: Users,
      title: 'Profesores Expertos',
      description: 'Conecta con profesionales certificados en tu área.',
    },
    {
      icon: TrendingUp,
      title: 'Sigue tu Progreso',
      description: 'Monitorea tu progreso con historial de sesiones y estadísticas.',
    },
    {
      icon: DollarSign,
      title: 'Precios Transparentes',
      description: 'Tarifas por hora claras sin cargos ocultos ni sorpresas.',
    },
  ];

  const benefits = [
    'Encuentra profesores certificados cerca de ti',
    'Reserva sesiones semanales recurrentes fácilmente',
    'Chat en tiempo real con tu profesor',
    'Opciones de horarios flexibles',
    'Historial de entrenamientos',
    'Pagos seguros en línea',
  ];

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "AceX",
      "url": window.location.origin,
      "description": "Reserva profesores deportivos y entrena con la élite. La plataforma definitiva para deportistas de verdad.",
      "applicationCategory": "SportsApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "category": "Sports Coaching"
      }
    };

    return (
    <>
      <Helmet>
        <title>AceX | Domina la Cancha</title>
        <meta name="description" content="Reserva profesores deportivos y entrena con la élite. La plataforma definitiva para deportistas de verdad." />
        <meta name="keywords" content="profesores deportivos, clases deportes, tenis, fútbol, padel, entrenamiento personal, reservar clases" />
        <link rel="canonical" href={window.location.origin} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-pulse-soft" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse-soft" />
        </div>
        
        <div className="relative container mx-auto px-4 py-16 sm:py-24 md:py-32">
          <nav className="flex items-center justify-between mb-10 sm:mb-16">
            <Link to="/" className="flex items-center">
              <AcexLogo size="lg" textClassName="text-primary-foreground" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" className="hidden sm:inline-flex text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link to="/auth">Iniciar Sesión</Link>
              </Button>
              <Button size="sm" className="sm:hidden gradient-primary" asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link to="/auth">Comenzar</Link>
              </Button>
            </div>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/20 text-primary-foreground text-xs sm:text-sm mb-6">
              <Star className="w-4 h-4 shrink-0" />
              <span>Más de 10,000 atletas confían en nosotros</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-primary-foreground mb-4 sm:mb-6 leading-tight uppercase tracking-tight">
              Elevá tu{' '}
              <span className="text-gradient-primary">juego.</span>
            </h1>
            
            <p className="text-base sm:text-xl text-primary-foreground/80 mb-6 sm:mb-8 max-w-2xl">
              Reserva profesores y entrena con la élite. La plataforma definitiva para deportistas de verdad.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button size="lg" className="w-full sm:w-auto gradient-primary shadow-glow text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 uppercase tracking-wide font-semibold" asChild>
                <Link to="/auth">
                  Reservar Ahora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 h-12 sm:h-14 px-6 sm:px-8" asChild>
                <Link to="/auth">
                  Ser Profesor
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background" aria-label="Características de AceX">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">¿Por qué elegir AceX?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Todo lo que necesitas para conectar con el profesor ideal y alcanzar tus metas fitness.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="p-6 rounded-2xl bg-card border border-border card-hover animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-muted/30" aria-label="Beneficios">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Todo lo que necesitas para{' '}
                <span className="text-gradient-primary">superarte</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Ya seas un estudiante buscando un profesor o un profesor queriendo hacer crecer tu negocio, AceX te tiene cubierto.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <Button className="mt-8 gradient-primary shadow-glow" size="lg" asChild>
                <Link to="/auth">
                  Comenzar Gratis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 gradient-primary rounded-3xl blur-3xl opacity-20" />
              <div className="relative bg-card rounded-3xl border border-border p-8 shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                    J
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Juan García</h4>
                    <p className="text-muted-foreground">Profesor de Tenis</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <Star className="w-5 h-5 text-warning fill-warning" />
                    <span className="font-semibold">4.9</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-primary" />
                      <span>Martes, 10:00 AM</span>
                    </div>
                    <span className="text-primary font-semibold">$50</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-primary" />
                      <span>Jueves, 10:00 AM</span>
                    </div>
                    <span className="text-primary font-semibold">$50</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-primary" />
                      <span>Sábado, 2:00 PM</span>
                    </div>
                    <span className="text-primary font-semibold">$50</span>
                  </div>
                </div>
                
                <Button className="w-full mt-6 gradient-primary">
                  Reservar Todas - $150/semana
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-dark relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
        </div>
        
        <div className="relative container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
            ¿Listo para transformar tu fitness?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Únete a miles de atletas que ya entrenan con los mejores profesores en AceX.
          </p>
          <Button size="lg" className="gradient-primary shadow-glow text-lg h-14 px-10 uppercase tracking-wide font-semibold" asChild>
            <Link to="/auth">
              Comenzar Ahora
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t border-border" role="contentinfo">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center" aria-label="AceX - Inicio">
              <AcexLogo size="md" />
            </Link>
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} AceX. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
