import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CalendarIcon, X, SlidersHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface BookingFilterValues {
  search: string;
  date: Date | undefined;
  status: string;
}

interface BookingFiltersProps {
  filters: BookingFilterValues;
  onFiltersChange: (filters: BookingFilterValues) => void;
  searchPlaceholder?: string;
  showStatus?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export default function BookingFilters({
  filters,
  onFiltersChange,
  searchPlaceholder = 'Buscar por nombre...',
  showStatus = true,
}: BookingFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const hasActiveFilters = filters.search || filters.date || filters.status !== 'all';

  const updateFilter = (key: keyof BookingFilterValues, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({ search: '', date: undefined, status: 'all' });
  };

  return (
    <div className="space-y-3 mb-4 sm:mb-6">
      {/* Main search row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 h-9 sm:h-10 text-sm"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Button
          variant={expanded ? 'secondary' : 'outline'}
          size="sm"
          className="h-9 sm:h-10 gap-1.5 shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filtros</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-primary" />
          )}
        </Button>
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-muted/40 rounded-lg border">
          {/* Date picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-9 justify-start text-left font-normal text-sm flex-1 sm:flex-none sm:w-48',
                  !filters.date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
                {filters.date
                  ? format(filters.date, "d 'de' MMM, yyyy", { locale: es })
                  : 'Filtrar por fecha'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.date}
                onSelect={(d) => updateFilter('date', d)}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

          {/* Status dropdown */}
          {showStatus && (
            <Select
              value={filters.status}
              onValueChange={(v) => updateFilter('status', v)}
            >
              <SelectTrigger className="h-9 text-sm flex-1 sm:flex-none sm:w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Clear */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Utility: client-side filter function
export function filterBookings<T extends { status: string; booking_date: string }>(
  bookings: T[],
  filters: BookingFilterValues,
  getSearchName: (b: T) => string
): T[] {
  return bookings.filter((b) => {
    // Search filter
    if (filters.search) {
      const name = getSearchName(b).toLowerCase();
      if (!name.includes(filters.search.toLowerCase())) return false;
    }

    // Date filter
    if (filters.date) {
      const bookingDate = b.booking_date;
      const filterDate = format(filters.date, 'yyyy-MM-dd');
      if (bookingDate !== filterDate) return false;
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (b.status !== filters.status) return false;
    }

    return true;
  });
}
