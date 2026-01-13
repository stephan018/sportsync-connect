import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Save, User } from 'lucide-react';

const SPORTS = [
  'Tenis',
  'Natación',
  'Golf',
  'Baloncesto',
  'Fútbol',
  'Voleibol',
  'Boxeo',
  'Yoga',
  'Pilates',
  'CrossFit',
  'Running',
  'Ciclismo',
  'Artes Marciales',
  'Baile',
  'Gimnasia',
  'Remo',
  'Surf',
  'Esquí',
  'Snowboard',
  'Otro',
];

export default function Settings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [sport, setSport] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setHourlyRate(profile.hourly_rate?.toString() || '50');
      setSport(profile.sport || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          bio,
          hourly_rate: parseFloat(hourlyRate) || 0,
          sport,
        })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('¡Perfil actualizado exitosamente!');
    } catch (error: any) {
      toast.error('Error al actualizar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Configuración del Perfil</h1>
          <p className="text-muted-foreground mt-1">
            Administra tu información de perfil y preferencias de enseñanza
          </p>
        </div>

        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Información Personal
              </CardTitle>
              <CardDescription>
                Actualiza los detalles de tu perfil visibles para los estudiantes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biografía</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Cuéntales a los estudiantes sobre ti y tu experiencia como profesor..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalles de Enseñanza</CardTitle>
              <CardDescription>
                Configura tu especialidad deportiva y tarifa por hora
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sport">Deporte / Actividad</Label>
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu deporte" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Tarifa por Hora ($)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  min="0"
                  step="5"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="50"
                />
                <p className="text-sm text-muted-foreground">
                  Esta es la tarifa que los estudiantes pagarán por hora de sesión
                </p>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
