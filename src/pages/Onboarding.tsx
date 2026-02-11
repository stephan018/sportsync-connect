import { useState } from 'react';
import AcexLogo from '@/components/brand/AcexLogo';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dumbbell, Trophy, Target, Bike, Waves, Mountain, Swords, Heart, Footprints,
  ArrowRight, ArrowLeft, CheckCircle2, Loader2, MapPin, Clock, DollarSign,
  Sparkles, User, Star
} from 'lucide-react';
import { toast } from 'sonner';

const SPORTS = [
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

const SKILL_LEVELS = [
  { id: 'beginner', label: 'Principiante', description: 'Estoy empezando', icon: '🌱' },
  { id: 'intermediate', label: 'Intermedio', description: 'Tengo algo de experiencia', icon: '⚡' },
  { id: 'advanced', label: 'Avanzado', description: 'Busco perfeccionar', icon: '🏆' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isTeacher = profile?.role === 'teacher';
  const totalSteps = isTeacher ? 3 : 2;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Teacher state
  const [bio, setBio] = useState(profile?.bio || '');
  const [yearsOfExperience, setYearsOfExperience] = useState<number | ''>('');
  const [selectedSport, setSelectedSport] = useState<string>(profile?.sport || '');
  const [hourlyRate, setHourlyRate] = useState<number | ''>(profile?.hourly_rate || 50);
  const [location, setLocation] = useState('');

  // Student state
  const [sportsInterests, setSportsInterests] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('');

  const toggleSportInterest = (sportId: string) => {
    setSportsInterests(prev =>
      prev.includes(sportId) ? prev.filter(s => s !== sportId) : [...prev, sportId]
    );
  };

  const canProceed = () => {
    if (isTeacher) {
      if (step === 1) return bio.trim().length >= 10;
      if (step === 2) return selectedSport !== '';
      if (step === 3) return hourlyRate !== '' && Number(hourlyRate) > 0;
    } else {
      if (step === 1) return sportsInterests.length > 0;
      if (step === 2) return skillLevel !== '';
    }
    return false;
  };

  const handleFinish = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = { is_onboarded: true };
      if (isTeacher) {
        updates.bio = bio;
        updates.years_of_experience = yearsOfExperience || null;
        updates.sport = selectedSport;
        updates.hourly_rate = Number(hourlyRate);
        updates.location = location || null;
      } else {
        updates.sports_interests = sportsInterests;
        updates.skill_level = skillLevel;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('¡Perfil configurado exitosamente!');
      // Force a page reload to refetch profile with is_onboarded = true
      window.location.href = isTeacher ? '/dashboard' : '/browse';
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen gradient-dark flex flex-col">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AcexLogo size="md" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Paso {step} de {totalSteps}
            </span>
            <Badge variant="secondary" className="text-xs">
              {isTeacher ? 'Profesor' : 'Estudiante'}
            </Badge>
          </div>
        </div>
        <div className="max-w-2xl mx-auto mt-4">
          <Progress value={progress} className="h-1.5" />
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl animate-slide-up">

          {/* ===== TEACHER FLOW ===== */}
          {isTeacher && step === 1 && (
            <StepContainer
              icon={<User className="w-6 h-6" />}
              title="Cuéntanos sobre ti"
              subtitle="Tu biografía ayuda a los estudiantes a conocerte mejor"
            >
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm font-medium">
                    Biografía profesional
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder="Describe tu experiencia, estilo de enseñanza y qué pueden esperar tus estudiantes..."
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {bio.length < 10 ? `Mínimo 10 caracteres (${bio.length}/10)` : `${bio.length} caracteres`}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience" className="text-sm font-medium">
                    Años de experiencia
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="experience"
                      type="number"
                      min={0}
                      max={50}
                      placeholder="Ej: 5"
                      value={yearsOfExperience}
                      onChange={e => setYearsOfExperience(e.target.value ? Number(e.target.value) : '')}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </StepContainer>
          )}

          {isTeacher && step === 2 && (
            <StepContainer
              icon={<Trophy className="w-6 h-6" />}
              title="¿Qué deporte enseñas?"
              subtitle="Selecciona tu especialidad principal"
            >
              <div className="grid grid-cols-3 gap-3">
                {SPORTS.map(sport => {
                  const Icon = sport.icon;
                  const isSelected = selectedSport === sport.id;
                  return (
                    <button
                      key={sport.id}
                      onClick={() => setSelectedSport(sport.id)}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200
                        ${isSelected
                          ? 'border-primary bg-primary/10 shadow-md scale-[1.02]'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
                        }
                      `}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {sport.label}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </StepContainer>
          )}

          {isTeacher && step === 3 && (
            <StepContainer
              icon={<DollarSign className="w-6 h-6" />}
              title="Configuración base"
              subtitle="Define tu tarifa y ubicación"
            >
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="rate" className="text-sm font-medium">
                    Tarifa por hora (USD)
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="rate"
                      type="number"
                      min={1}
                      placeholder="50"
                      value={hourlyRate}
                      onChange={e => setHourlyRate(e.target.value ? Number(e.target.value) : '')}
                      className="pl-10 text-lg font-semibold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium">
                    Ubicación / Club
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="Ej: Club Deportivo Central, Buenos Aires"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Opcional — puedes agregarlo después</p>
                </div>
              </div>
            </StepContainer>
          )}

          {/* ===== STUDENT FLOW ===== */}
          {!isTeacher && step === 1 && (
            <StepContainer
              icon={<Sparkles className="w-6 h-6" />}
              title="¿Qué deportes te interesan?"
              subtitle="Selecciona uno o más para personalizar tu experiencia"
            >
              <div className="grid grid-cols-3 gap-3">
                {SPORTS.map(sport => {
                  const Icon = sport.icon;
                  const isSelected = sportsInterests.includes(sport.id);
                  return (
                    <button
                      key={sport.id}
                      onClick={() => toggleSportInterest(sport.id)}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200
                        ${isSelected
                          ? 'border-primary bg-primary/10 shadow-md scale-[1.02]'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
                        }
                      `}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {sport.label}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
              {sportsInterests.length > 0 && (
                <p className="text-sm text-muted-foreground mt-3">
                  {sportsInterests.length} deporte{sportsInterests.length !== 1 ? 's' : ''} seleccionado{sportsInterests.length !== 1 ? 's' : ''}
                </p>
              )}
            </StepContainer>
          )}

          {!isTeacher && step === 2 && (
            <StepContainer
              icon={<Star className="w-6 h-6" />}
              title="¿Cuál es tu nivel?"
              subtitle="Nos ayuda a recomendarte los mejores profesores"
            >
              <RadioGroup value={skillLevel} onValueChange={setSkillLevel} className="space-y-3">
                {SKILL_LEVELS.map(level => (
                  <Label
                    key={level.id}
                    htmlFor={`level-${level.id}`}
                    className={`
                      flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                      ${skillLevel === level.id
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-border bg-card hover:border-primary/40'
                      }
                    `}
                  >
                    <RadioGroupItem value={level.id} id={`level-${level.id}`} className="sr-only" />
                    <span className="text-2xl">{level.icon}</span>
                    <div className="flex-1">
                      <p className={`font-semibold ${skillLevel === level.id ? 'text-primary' : 'text-foreground'}`}>
                        {level.label}
                      </p>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                    {skillLevel === level.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </Label>
                ))}
              </RadioGroup>
            </StepContainer>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Atrás
            </Button>

            {step < totalSteps ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="gap-2 gradient-primary text-primary-foreground px-8"
              >
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={!canProceed() || saving}
                className="gap-2 gradient-primary text-primary-foreground px-8"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Completar
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StepContainer({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-card/95 backdrop-blur-sm border-border/50 shadow-xl">
      <CardContent className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground">
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="mt-6">{children}</div>
      </CardContent>
    </Card>
  );
}
