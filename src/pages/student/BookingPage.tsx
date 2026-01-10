import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Availability, DAYS_OF_WEEK } from '@/types/database';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarDays, Clock, DollarSign, Loader2, Check, X } from 'lucide-react';
import { format, addDays, addMonths, getDay, isSameDay, isAfter, startOfDay } from 'date-fns';
import { toast } from 'sonner';

type DurationOption = '1_week' | '2_weeks' | '1_month' | '2_months' | '3_months';

const DURATION_OPTIONS: { value: DurationOption; label: string; days: number }[] = [
  { value: '1_week', label: '1 Week', days: 7 },
  { value: '2_weeks', label: '2 Weeks', days: 14 },
  { value: '1_month', label: '1 Month', days: 30 },
  { value: '2_months', label: '2 Months', days: 60 },
  { value: '3_months', label: '3 Months', days: 90 },
];

export default function BookingPage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  
  // Booking form state
  const [startDate, setStartDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [duration, setDuration] = useState<DurationOption>('1_month');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  
  // Calculated dates
  const [calculatedDates, setCalculatedDates] = useState<Date[]>([]);
  const [conflictDates, setConflictDates] = useState<Date[]>([]);

  useEffect(() => {
    if (teacherId) {
      fetchTeacherData();
    }
  }, [teacherId]);

  useEffect(() => {
    if (startDate && selectedDays.length > 0 && duration) {
      calculateBookingDates();
    } else {
      setCalculatedDates([]);
    }
  }, [startDate, selectedDays, duration]);

  const fetchTeacherData = async () => {
    try {
      // Fetch teacher profile
      const { data: teacherData, error: teacherError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', teacherId)
        .single();

      if (teacherError) throw teacherError;
      setTeacher(teacherData as Profile);

      // Fetch teacher availability
      const { data: availData, error: availError } = await supabase
        .from('availability')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('is_available', true);

      if (availError) throw availError;
      setAvailability(availData as Availability[]);
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      toast.error('Failed to load teacher information');
    } finally {
      setLoading(false);
    }
  };

  const calculateBookingDates = async () => {
    if (!startDate || selectedDays.length === 0) return;

    const durationDays = DURATION_OPTIONS.find(d => d.value === duration)?.days || 30;
    const endDate = addDays(startDate, durationDays);
    const dates: Date[] = [];
    
    let currentDate = startDate;
    while (isAfter(endDate, currentDate) || isSameDay(endDate, currentDate)) {
      const dayOfWeek = getDay(currentDate);
      if (selectedDays.includes(dayOfWeek)) {
        dates.push(currentDate);
      }
      currentDate = addDays(currentDate, 1);
    }

    setCalculatedDates(dates);

    // Check for conflicts with existing bookings
    if (dates.length > 0 && teacherId) {
      const dateStrings = dates.map(d => format(d, 'yyyy-MM-dd'));
      
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('booking_date')
        .eq('teacher_id', teacherId)
        .in('booking_date', dateStrings)
        .in('status', ['pending', 'confirmed']);

      if (existingBookings) {
        const conflicts = existingBookings.map(b => new Date(b.booking_date));
        setConflictDates(conflicts);
      }
    }
  };

  const toggleDay = (dayValue: number) => {
    // Check if the day is available for this teacher
    const isAvailable = availability.some(a => a.day_of_week === dayValue);
    if (!isAvailable) {
      toast.error(`The teacher is not available on ${DAYS_OF_WEEK.find(d => d.value === dayValue)?.label}`);
      return;
    }

    setSelectedDays(prev =>
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const getAvailableTimeSlots = () => {
    if (selectedDays.length === 0) return [];
    
    // Get time slots that are available on ALL selected days
    const slots = new Set<string>();
    
    selectedDays.forEach(day => {
      const dayAvailability = availability.filter(a => a.day_of_week === day);
      dayAvailability.forEach(a => {
        slots.add(`${a.start_time}-${a.end_time}`);
      });
    });

    return Array.from(slots);
  };

  const totalPrice = calculatedDates.length * (Number(teacher?.hourly_rate) || 0);

  const handleBooking = async () => {
    if (!profile?.id || !teacherId || calculatedDates.length === 0 || !selectedTimeSlot) {
      toast.error('Please complete all booking details');
      return;
    }

    setBooking(true);

    try {
      const [startTime, endTime] = selectedTimeSlot.split('-');
      const hourlyRate = Number(teacher?.hourly_rate) || 0;

      // Create bookings for all calculated dates (excluding conflicts)
      const validDates = calculatedDates.filter(
        date => !conflictDates.some(cd => isSameDay(cd, date))
      );

      const bookingsToInsert = validDates.map(date => ({
        student_id: profile.id,
        teacher_id: teacherId,
        booking_date: format(date, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        status: 'pending' as const,
        total_price: hourlyRate,
      }));

      const { error } = await supabase
        .from('bookings')
        .insert(bookingsToInsert);

      if (error) throw error;

      toast.success(`Successfully booked ${validDates.length} sessions!`);
      navigate('/bookings');
    } catch (error) {
      console.error('Error creating bookings:', error);
      toast.error('Failed to create bookings');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!teacher) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Teacher not found</p>
          <Button onClick={() => navigate('/browse')} className="mt-4">
            Back to Browse
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/browse')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teachers
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Teacher Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                    {teacher.full_name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{teacher.full_name}</h2>
                    <p className="text-muted-foreground">
                      {teacher.bio || 'Professional sports coach'}
                    </p>
                    <Badge className="mt-2 gradient-primary">
                      <DollarSign className="w-3 h-3 mr-1" />
                      ${Number(teacher.hourly_rate)}/hour
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Start Date */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  Select Start Date
                </CardTitle>
                <CardDescription>When would you like to start your sessions?</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date < startOfDay(new Date())}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {/* Recurring Days Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Select Recurring Days
                </CardTitle>
                <CardDescription>Choose which days of the week you want to attend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isAvailable = availability.some(a => a.day_of_week === day.value);
                    const isSelected = selectedDays.includes(day.value);
                    
                    return (
                      <button
                        key={day.value}
                        onClick={() => toggleDay(day.value)}
                        disabled={!isAvailable}
                        className={`
                          p-3 rounded-lg border-2 text-center transition-all
                          ${isSelected 
                            ? 'border-primary bg-primary text-primary-foreground' 
                            : isAvailable
                              ? 'border-border hover:border-primary/50'
                              : 'border-border bg-muted opacity-50 cursor-not-allowed'
                          }
                        `}
                      >
                        <span className="text-sm font-medium">{day.short}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Greyed out days are not available for this teacher
                </p>
              </CardContent>
            </Card>

            {/* Duration */}
            <Card>
              <CardHeader>
                <CardTitle>Session Duration</CardTitle>
                <CardDescription>How long would you like to book sessions for?</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={duration} onValueChange={(v) => setDuration(v as DurationOption)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Time Slot */}
            {selectedDays.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Time Slot</CardTitle>
                  <CardDescription>Choose your preferred time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {getAvailableTimeSlots().map((slot) => {
                      const [start, end] = slot.split('-');
                      return (
                        <button
                          key={slot}
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`
                            p-3 rounded-lg border-2 text-center transition-all
                            ${selectedTimeSlot === slot
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border hover:border-primary/50'
                            }
                          `}
                        >
                          <span className="text-sm font-medium">
                            {start.slice(0, 5)} - {end.slice(0, 5)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected Dates */}
                {calculatedDates.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Sessions ({calculatedDates.length} total)</p>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {calculatedDates.slice(0, 10).map((date, idx) => {
                        const hasConflict = conflictDates.some(cd => isSameDay(cd, date));
                        return (
                          <div 
                            key={idx}
                            className={`flex items-center justify-between text-sm p-2 rounded ${
                              hasConflict ? 'bg-destructive/10' : 'bg-muted'
                            }`}
                          >
                            <span>{format(date, 'EEE, MMM d, yyyy')}</span>
                            {hasConflict ? (
                              <X className="w-4 h-4 text-destructive" />
                            ) : (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        );
                      })}
                      {calculatedDates.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          +{calculatedDates.length - 10} more sessions
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Rate per session</span>
                    <span>${Number(teacher.hourly_rate)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Number of sessions</span>
                    <span>{calculatedDates.length - conflictDates.length}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span className="text-primary">
                      ${(calculatedDates.length - conflictDates.length) * Number(teacher.hourly_rate)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full gradient-primary"
                  disabled={calculatedDates.length === 0 || !selectedTimeSlot || booking}
                  onClick={handleBooking}
                >
                  {booking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirm Booking
                    </>
                  )}
                </Button>
                
                {conflictDates.length > 0 && (
                  <p className="text-xs text-destructive text-center">
                    {conflictDates.length} date(s) already booked and will be skipped
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
