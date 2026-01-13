import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, Wand2, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkAvailabilityWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (config: BulkConfig) => void;
}

export interface BulkConfig {
  selectedDays: number[];
  startTime: string;
  endTime: string;
  sessionDuration: number;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes', short: 'L' },
  { value: 2, label: 'Martes', short: 'M' },
  { value: 3, label: 'Miércoles', short: 'X' },
  { value: 4, label: 'Jueves', short: 'J' },
  { value: 5, label: 'Viernes', short: 'V' },
  { value: 6, label: 'Sábado', short: 'S' },
  { value: 0, label: 'Domingo', short: 'D' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1 hora 30 minutos' },
  { value: 120, label: '2 horas' },
];

export function BulkAvailabilityWizard({ open, onOpenChange, onGenerate }: BulkAvailabilityWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [sessionDuration, setSessionDuration] = useState(60);

  const totalSteps = 3;

  const toggleDay = (dayValue: number) => {
    setSelectedDays(prev => 
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const handleGenerate = () => {
    onGenerate({
      selectedDays,
      startTime,
      endTime,
      sessionDuration,
    });
    onOpenChange(false);
    setStep(1);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedDays.length > 0;
      case 2:
        return startTime && endTime && startTime < endTime;
      case 3:
        return sessionDuration > 0;
      default:
        return false;
    }
  };

  // Calculate preview of slots that will be generated
  const calculatePreview = () => {
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    const hoursAvailable = endHour - startHour;
    const slotsPerDay = Math.floor((hoursAvailable * 60) / sessionDuration);
    const totalSlots = slotsPerDay * selectedDays.length;
    return { slotsPerDay, totalSlots };
  };

  const { slotsPerDay, totalSlots } = calculatePreview();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Generar Disponibilidad
          </DialogTitle>
          <DialogDescription>
            Configura tu horario y generaremos los bloques automáticamente
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                s === step
                  ? "bg-primary text-primary-foreground scale-110"
                  : s < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[200px] py-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium">
                <Calendar className="w-5 h-5 text-primary" />
                ¿Qué días enseñas?
              </div>
              <p className="text-sm text-muted-foreground">
                Selecciona los días de la semana en los que ofreces clases
              </p>
              <div className="grid grid-cols-7 gap-2 pt-4">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-lg border-2 transition-all hover:scale-105",
                      selectedDays.includes(day.value)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-lg font-bold">{day.short}</span>
                    <span className="text-xs mt-1 opacity-70">{day.label.slice(0, 3)}</span>
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground pt-2">
                {selectedDays.length} día{selectedDays.length !== 1 ? 's' : ''} seleccionado{selectedDays.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium">
                <Clock className="w-5 h-5 text-primary" />
                ¿En qué horario enseñas?
              </div>
              <p className="text-sm text-muted-foreground">
                Define el rango de horas en las que ofreces clases
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label>Hora de inicio</Label>
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger>
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
                </div>
                <div className="space-y-2">
                  <Label>Hora de fin</Label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.filter(t => t.value > startTime).map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {startTime && endTime && startTime < endTime && (
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                  <p className="text-sm">
                    Horario: <span className="font-semibold">{startTime}</span> a <span className="font-semibold">{endTime}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {parseInt(endTime.split(':')[0]) - parseInt(startTime.split(':')[0])} horas disponibles por día
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium">
                <Users className="w-5 h-5 text-primary" />
                ¿Cuánto duran tus clases?
              </div>
              <p className="text-sm text-muted-foreground">
                Selecciona la duración estándar de cada sesión
              </p>
              <div className="grid grid-cols-1 gap-2 pt-4">
                {DURATION_OPTIONS.map((duration) => (
                  <button
                    key={duration.value}
                    onClick={() => setSessionDuration(duration.value)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border-2 transition-all",
                      sessionDuration === duration.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="font-medium">{duration.label}</span>
                    {sessionDuration === duration.value && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
              
              {/* Preview */}
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Vista previa</span>
                </div>
                <p className="text-2xl font-bold text-primary">{totalSlots} bloques</p>
                <p className="text-sm text-muted-foreground">
                  {slotsPerDay} clases por día × {selectedDays.length} días
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>
          
          {step < totalSteps ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={!canProceed()}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Generar {totalSlots} bloques
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}