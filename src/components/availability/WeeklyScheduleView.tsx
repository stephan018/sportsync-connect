import { useMemo } from 'react';
import { Availability } from '@/types/database';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeeklyScheduleViewProps {
  availability: Availability[];
  isSlotBooked: (dayOfWeek: number, startTime: string) => boolean;
  className?: string;
}

const DAYS_OF_WEEK_ES = [
  { value: 0, label: 'Domingo', short: 'Dom', initial: 'D' },
  { value: 1, label: 'Lunes', short: 'Lun', initial: 'L' },
  { value: 2, label: 'Martes', short: 'Mar', initial: 'M' },
  { value: 3, label: 'Miércoles', short: 'Mié', initial: 'X' },
  { value: 4, label: 'Jueves', short: 'Jue', initial: 'J' },
  { value: 5, label: 'Viernes', short: 'Vie', initial: 'V' },
  { value: 6, label: 'Sábado', short: 'Sáb', initial: 'S' },
];

export default function WeeklyScheduleView({ 
  availability, 
  isSlotBooked,
  className 
}: WeeklyScheduleViewProps) {
  const availabilityByDay = useMemo(() => 
    DAYS_OF_WEEK_ES.map((day) => ({
      ...day,
      slots: availability.filter((a) => a.day_of_week === day.value),
    })),
    [availability]
  );

  const totalSlots = availability.length;
  const bookedSlots = availability.filter(slot => 
    isSlotBooked(slot.day_of_week, slot.start_time)
  ).length;
  const availableSlots = totalSlots - bookedSlots;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 lg:p-4 text-center">
          <div className="text-2xl lg:text-3xl font-bold text-primary">{totalSlots}</div>
          <div className="text-[10px] lg:text-xs text-muted-foreground mt-1">Total Horarios</div>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 lg:p-4 text-center">
          <div className="text-2xl lg:text-3xl font-bold text-emerald-600">{availableSlots}</div>
          <div className="text-[10px] lg:text-xs text-muted-foreground mt-1">Disponibles</div>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 lg:p-4 text-center">
          <div className="text-2xl lg:text-3xl font-bold text-amber-600">{bookedSlots}</div>
          <div className="text-[10px] lg:text-xs text-muted-foreground mt-1">Reservados</div>
        </div>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {availabilityByDay.map((day) => {
            const hasSlots = day.slots.length > 0;
            const allBooked = day.slots.length > 0 && day.slots.every(slot => 
              isSlotBooked(day.value, slot.start_time)
            );
            
            return (
              <div
                key={day.value}
                className={cn(
                  "py-3 lg:py-4 text-center border-b transition-colors",
                  hasSlots && !allBooked 
                    ? "bg-primary/5 border-b-primary/30" 
                    : allBooked 
                      ? "bg-amber-500/5 border-b-amber-500/30"
                      : "border-b-border"
                )}
              >
                <span className="hidden md:block text-xs lg:text-sm font-semibold text-foreground">
                  {day.short}
                </span>
                <span className="md:hidden text-xs font-semibold text-foreground">
                  {day.initial}
                </span>
                {hasSlots && (
                  <div className={cn(
                    "text-[10px] mt-0.5",
                    allBooked ? "text-amber-600" : "text-primary"
                  )}>
                    {day.slots.length} {day.slots.length === 1 ? 'hora' : 'horas'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time Slots Grid */}
        <div className="grid grid-cols-7 min-h-[200px]">
          {availabilityByDay.map((day) => (
            <div
              key={day.value}
              className={cn(
                "border-r last:border-r-0 p-1.5 lg:p-2",
                day.slots.length === 0 && "bg-muted/20"
              )}
            >
              {day.slots.length > 0 ? (
                <div className="space-y-1 lg:space-y-1.5">
                  {day.slots.map((slot) => {
                    const booked = isSlotBooked(day.value, slot.start_time);
                    return (
                      <TimeSlotBadge
                        key={slot.id}
                        time={slot.start_time}
                        booked={booked}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-muted-foreground/40 text-lg">—</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-muted-foreground">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-muted-foreground">Reservado esta semana</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-muted/50 border border-border flex items-center justify-center">
            <XCircle className="w-3.5 h-3.5 text-muted-foreground/40" />
          </div>
          <span className="text-muted-foreground">Sin horarios</span>
        </div>
      </div>
    </div>
  );
}

interface TimeSlotBadgeProps {
  time: string;
  booked: boolean;
}

function TimeSlotBadge({ time, booked }: TimeSlotBadgeProps) {
  const formattedTime = time.slice(0, 5);
  
  return (
    <div
      className={cn(
        "relative group cursor-default rounded-lg px-1.5 lg:px-2 py-1.5 lg:py-2 text-center transition-all duration-200",
        "text-[10px] lg:text-xs font-medium",
        booked
          ? "bg-gradient-to-br from-amber-500/20 to-amber-400/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:border-amber-500/50 hover:shadow-sm"
          : "bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-sm"
      )}
      title={booked ? 'Horario reservado esta semana' : 'Horario disponible'}
    >
      <div className="flex items-center justify-center gap-0.5 lg:gap-1">
        {booked ? (
          <Clock className="w-2.5 lg:w-3 h-2.5 lg:h-3 shrink-0" />
        ) : (
          <CheckCircle className="w-2.5 lg:w-3 h-2.5 lg:h-3 shrink-0 opacity-70" />
        )}
        <span>{formattedTime}</span>
      </div>
      
      {/* Tooltip on hover */}
      <div className={cn(
        "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg text-xs whitespace-nowrap",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10",
        booked 
          ? "bg-amber-600 text-white" 
          : "bg-emerald-600 text-white"
      )}>
        {booked ? 'Reservado' : 'Disponible'}
        <div className={cn(
          "absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent",
          booked ? "border-t-amber-600" : "border-t-emerald-600"
        )} />
      </div>
    </div>
  );
}
