import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Clock, Plus, Trash2, Save, Loader2, Wand2, DollarSign, Users, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { BulkAvailabilityWizard, BulkConfig } from '@/components/availability/BulkAvailabilityWizard';

const DAYS_OF_WEEK_ES = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2).toString().padStart(2, '0');
  const minutes = i % 2 === 0 ? '00' : '30';
  return { value: `${hour}:${minutes}:00`, label: `${hour}:${minutes}` };
});

const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
];

export default function TeacherAvailability() {
  const { profile } = useAuth();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  
  // Pricing and capacity settings
  const [hourlyRate, setHourlyRate] = useState('50');
  const [groupHourlyRate, setGroupHourlyRate] = useState('30');
  const [maxStudents, setMaxStudents] = useState(1);
  const [sessionDuration, setSessionDuration] = useState(60);

  useEffect(() => {
    if (profile?.id) {
      fetchAvailability();
      fetchPricingSettings();
    }
  }, [profile?.id]);

  const fetchPricingSettings = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('hourly_rate, group_hourly_rate, max_students_per_session, session_duration')
        .eq('id', profile.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setHourlyRate(data.hourly_rate?.toString() || '50');
        setGroupHourlyRate(data.group_hourly_rate?.toString() || '30');
        setMaxStudents(data.max_students_per_session || 1);
        setSessionDuration(data.session_duration || 60);
      }
    } catch (error) {
      console.error('Error fetching pricing settings:', error);
    }
  };

  const fetchAvailability = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setAvailability(data as AvailabilitySlot[]);
      } else {
        setAvailability([]);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Error al cargar disponibilidad');
    } finally {
      setLoading(false);
    }
  };

  const addSlot = (dayOfWeek: number) => {
    const newSlot: AvailabilitySlot = {
      day_of_week: dayOfWeek,
      start_time: '09:00:00',
      end_time: '10:00:00',
      is_available: true,
    };
    setAvailability([...availability, newSlot]);
  };

  const removeSlot = async (index: number) => {
    const slot = availability[index];
    
    if (slot.id) {
      const { error } = await supabase
        .from('availability')
        .delete()
        .eq('id', slot.id);
      
      if (error) {
        toast.error('Error al eliminar horario');
        return;
      }
    }
    
    setAvailability(availability.filter((_, i) => i !== index));
    toast.success('Horario eliminado');
  };

  const updateSlot = (index: number, updates: Partial<AvailabilitySlot>) => {
    const newAvailability = [...availability];
    newAvailability[index] = { ...newAvailability[index], ...updates };
    setAvailability(newAvailability);
  };

  const handleBulkGenerate = (config: BulkConfig) => {
    const { selectedDays, startTime, endTime, sessionDuration: duration } = config;
    const newSlots: AvailabilitySlot[] = [];
    
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    
    selectedDays.forEach(day => {
      let currentHour = startHour;
      let currentMinutes = 0;
      
      while (currentHour < endHour || (currentHour === endHour && currentMinutes === 0)) {
        const slotStart = `${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}:00`;
        
        // Calculate end time
        let endMinutes = currentMinutes + duration;
        let endSlotHour = currentHour + Math.floor(endMinutes / 60);
        endMinutes = endMinutes % 60;
        
        // Don't create slot if it extends beyond end time
        if (endSlotHour > endHour || (endSlotHour === endHour && endMinutes > 0)) {
          break;
        }
        
        const slotEnd = `${endSlotHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;
        
        newSlots.push({
          day_of_week: day,
          start_time: slotStart,
          end_time: slotEnd,
          is_available: true,
        });
        
        // Move to next slot
        currentMinutes += duration;
        currentHour += Math.floor(currentMinutes / 60);
        currentMinutes = currentMinutes % 60;
      }
    });
    
    // Update session duration in state
    setSessionDuration(duration);
    
    setAvailability(newSlots);
    toast.success(`¡${newSlots.length} bloques generados!`);
  };

  const saveAvailability = async () => {
    if (!profile?.id) {
      toast.error('Perfil no cargado. Por favor recarga la página.');
      return;
    }
    
    setSaving(true);
    
    try {
      // Save pricing settings first
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          hourly_rate: parseFloat(hourlyRate) || 0,
          group_hourly_rate: parseFloat(groupHourlyRate) || 0,
          max_students_per_session: maxStudents,
          session_duration: sessionDuration,
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Delete existing availability
      const { error: deleteError } = await supabase
        .from('availability')
        .delete()
        .eq('teacher_id', profile.id);

      if (deleteError) throw deleteError;

      // Insert new availability
      if (availability.length > 0) {
        const slotsToInsert = availability.map(slot => ({
          teacher_id: profile.id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_available: slot.is_available,
        }));

        const { error } = await supabase
          .from('availability')
          .insert(slotsToInsert)
          .select();

        if (error) throw error;
      }

      toast.success('¡Disponibilidad y tarifas guardadas!');
      fetchAvailability();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error('Error al guardar: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const getDaySlots = (dayOfWeek: number) => {
    return availability.filter(slot => slot.day_of_week === dayOfWeek);
  };

  const clearAllSlots = () => {
    setAvailability([]);
    toast.info('Todos los horarios eliminados (guarda para confirmar)');
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Disponibilidad</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Configura tu horario semanal y tarifas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={clearAllSlots} className="flex-1 min-w-0 sm:flex-none">
              <Trash2 className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
              <span className="truncate">Limpiar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)} className="flex-1 min-w-0 sm:flex-none">
              <Wand2 className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
              <span className="truncate">Generar</span>
            </Button>
            <Button size="sm" onClick={saveAvailability} disabled={saving} className="bg-gradient-to-r from-primary to-primary/80 flex-1 min-w-0 sm:flex-none">
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin shrink-0" />
              ) : (
                <Save className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
              )}
              <span className="truncate">Guardar</span>
            </Button>
          </div>
        </div>

        {/* Pricing & Capacity Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Tarifas y Capacidad
            </CardTitle>
            <CardDescription>
              Define tus precios y el límite de estudiantes por sesión
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Individual Rate */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Precio Clase Individual
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="pl-8"
                    placeholder="50"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Por sesión (1 estudiante)</p>
              </div>

              {/* Group Rate */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Precio Clase Grupal
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    value={groupHourlyRate}
                    onChange={(e) => setGroupHourlyRate(e.target.value)}
                    className="pl-8"
                    placeholder="30"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Por persona en grupo</p>
              </div>

              {/* Max Students */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Máximo Estudiantes
                </Label>
                <Select 
                  value={maxStudents.toString()} 
                  onValueChange={(v) => setMaxStudents(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n === 1 ? 'Solo individual' : `Hasta ${n} personas`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Por sesión</p>
              </div>

              {/* Session Duration */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Duración de Clase
                </Label>
                <Select 
                  value={sessionDuration.toString()} 
                  onValueChange={(v) => setSessionDuration(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Duración estándar</p>
              </div>
            </div>

            {/* Pricing Preview */}
            {maxStudents > 1 && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Vista previa de ingresos por sesión:</p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">1 estudiante:</span>
                    <span className="font-bold text-primary">${hourlyRate}</span>
                  </div>
                  {[2, 3, 4].filter(n => n <= maxStudents).map(n => (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-muted-foreground">{n} estudiantes:</span>
                      <span className="font-bold text-primary">${(parseFloat(groupHourlyRate) * n).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {availability.length} bloques configurados
              </span>
              <span>•</span>
              <span>
                {DAYS_OF_WEEK_ES.filter(d => getDaySlots(d.value).length > 0).length} días activos
              </span>
            </div>

            {DAYS_OF_WEEK_ES.map((day) => {
              const slots = getDaySlots(day.value);
              
              return (
                <Card key={day.value}>
                  <CardContent className="p-3 sm:p-6">
                    <div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                          <h3 className="text-base sm:text-lg font-semibold">{day.label}</h3>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {slots.length} {slots.length === 1 ? 'bloque' : 'bloques'}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addSlot(day.value)}
                            className="ml-auto"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar
                          </Button>
                        </div>
                        
                        {slots.length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            Sin disponibilidad configurada
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
                            {slots.map((slot, slotIndex) => {
                              const actualIndex = availability.findIndex(
                                (s, i) => s.day_of_week === slot.day_of_week && 
                                  availability.slice(0, i + 1).filter(x => x.day_of_week === slot.day_of_week).length === slotIndex + 1
                              );
                              
                              return (
                                <div
                                  key={slotIndex}
                                  className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-muted/50 rounded-lg"
                                >
                                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0 hidden sm:block" />
                                  
                                  <Select
                                    value={slot.start_time}
                                    onValueChange={(value) => updateSlot(actualIndex, { start_time: value })}
                                  >
                                    <SelectTrigger className="w-[4.5rem] sm:w-20 h-8 text-xs sm:text-sm px-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TIME_OPTIONS.map((time) => (
                                        <SelectItem key={time.value} value={time.value}>
                                          {time.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  
                                  <span className="text-muted-foreground text-xs sm:text-sm">-</span>
                                  
                                  <Select
                                    value={slot.end_time}
                                    onValueChange={(value) => updateSlot(actualIndex, { end_time: value })}
                                  >
                                    <SelectTrigger className="w-[4.5rem] sm:w-20 h-8 text-xs sm:text-sm px-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TIME_OPTIONS.map((time) => (
                                        <SelectItem key={time.value} value={time.value}>
                                          {time.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  
                                  <Switch
                                    checked={slot.is_available}
                                    onCheckedChange={(checked) => updateSlot(actualIndex, { is_available: checked })}
                                    className="ml-auto"
                                  />
                                  
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive h-7 w-7 sm:h-8 sm:w-8"
                                    onClick={() => removeSlot(actualIndex)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <BulkAvailabilityWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onGenerate={handleBulkGenerate}
      />
    </DashboardLayout>
  );
}