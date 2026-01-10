import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Availability, DAYS_OF_WEEK } from '@/types/database';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00:00`, label: `${hour}:00` };
});

export default function TeacherAvailability() {
  const { profile } = useAuth();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchAvailability();
    }
  }, [profile?.id]);

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
        // Initialize with default availability (Mon-Fri 9am-5pm)
        const defaultSlots: AvailabilitySlot[] = DAYS_OF_WEEK
          .filter(day => day.value >= 1 && day.value <= 5)
          .map(day => ({
            day_of_week: day.value,
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_available: true,
          }));
        setAvailability(defaultSlots);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const addSlot = (dayOfWeek: number) => {
    const newSlot: AvailabilitySlot = {
      day_of_week: dayOfWeek,
      start_time: '09:00:00',
      end_time: '17:00:00',
      is_available: true,
    };
    setAvailability([...availability, newSlot]);
  };

  const removeSlot = async (index: number) => {
    const slot = availability[index];
    
    if (slot.id) {
      // Delete from database
      const { error } = await supabase
        .from('availability')
        .delete()
        .eq('id', slot.id);
      
      if (error) {
        toast.error('Failed to delete slot');
        return;
      }
    }
    
    setAvailability(availability.filter((_, i) => i !== index));
    toast.success('Slot removed');
  };

  const updateSlot = (index: number, updates: Partial<AvailabilitySlot>) => {
    const newAvailability = [...availability];
    newAvailability[index] = { ...newAvailability[index], ...updates };
    setAvailability(newAvailability);
  };

  const saveAvailability = async () => {
    if (!profile?.id) return;
    
    setSaving(true);
    
    try {
      // Delete existing availability
      await supabase
        .from('availability')
        .delete()
        .eq('teacher_id', profile.id);

      // Insert new availability
      const slotsToInsert = availability.map(slot => ({
        teacher_id: profile.id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available,
      }));

      const { error } = await supabase
        .from('availability')
        .insert(slotsToInsert);

      if (error) throw error;

      toast.success('Availability saved successfully!');
      fetchAvailability();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const getDaySlots = (dayOfWeek: number) => {
    return availability.filter(slot => slot.day_of_week === dayOfWeek);
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Availability</h1>
            <p className="text-muted-foreground mt-1">
              Set your weekly schedule for students to book
            </p>
          </div>
          <Button onClick={saveAvailability} disabled={saving} className="gradient-primary">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day) => {
              const slots = getDaySlots(day.value);
              
              return (
                <Card key={day.value}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <h3 className="text-lg font-semibold w-28">{day.label}</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addSlot(day.value)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Slot
                          </Button>
                        </div>
                        
                        {slots.length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            No availability set for this day
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {slots.map((slot, slotIndex) => {
                              const actualIndex = availability.findIndex(
                                (s, i) => s.day_of_week === slot.day_of_week && 
                                  availability.slice(0, i + 1).filter(x => x.day_of_week === slot.day_of_week).length === slotIndex + 1
                              );
                              
                              return (
                                <div
                                  key={slotIndex}
                                  className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                                >
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  
                                  <Select
                                    value={slot.start_time}
                                    onValueChange={(value) => updateSlot(actualIndex, { start_time: value })}
                                  >
                                    <SelectTrigger className="w-28">
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
                                  
                                  <span className="text-muted-foreground">to</span>
                                  
                                  <Select
                                    value={slot.end_time}
                                    onValueChange={(value) => updateSlot(actualIndex, { end_time: value })}
                                  >
                                    <SelectTrigger className="w-28">
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
                                  
                                  <div className="flex items-center gap-2 ml-auto">
                                    <Switch
                                      checked={slot.is_available}
                                      onCheckedChange={(checked) => updateSlot(actualIndex, { is_available: checked })}
                                    />
                                    <Label className="text-sm">
                                      {slot.is_available ? 'Active' : 'Inactive'}
                                    </Label>
                                  </div>
                                  
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => removeSlot(actualIndex)}
                                  >
                                    <Trash2 className="w-4 h-4" />
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
    </DashboardLayout>
  );
}
