import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Booking, Profile } from '@/types/database';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, DollarSign, Users, TrendingUp, ArrowUpRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface BookingWithStudent extends Booking {
  student: Profile;
}

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = useState<BookingWithStudent[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchDashboardData();
    }
  }, [profile?.id]);

  const fetchDashboardData = async () => {
    if (!profile?.id) return;

    try {
      // Fetch upcoming bookings
      const today = new Date().toISOString().split('T')[0];
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          student:profiles!bookings_student_id_fkey(*)
        `)
        .eq('teacher_id', profile.id)
        .gte('booking_date', today)
        .in('status', ['confirmed', 'pending'])
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5);

      if (bookings) {
        setUpcomingBookings(bookings as unknown as BookingWithStudent[]);
      }

      // Calculate monthly earnings
      const monthStart = startOfMonth(new Date()).toISOString().split('T')[0];
      const monthEnd = endOfMonth(new Date()).toISOString().split('T')[0];
      
      const { data: monthBookings } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('teacher_id', profile.id)
        .eq('status', 'completed')
        .gte('booking_date', monthStart)
        .lte('booking_date', monthEnd);

      if (monthBookings) {
        const total = monthBookings.reduce((sum, b) => sum + Number(b.total_price), 0);
        setMonthlyEarnings(total);
      }

      // Count unique students
      const { data: studentBookings } = await supabase
        .from('bookings')
        .select('student_id')
        .eq('teacher_id', profile.id);

      if (studentBookings) {
        const uniqueStudents = new Set(studentBookings.map(b => b.student_id));
        setTotalStudents(uniqueStudents.size);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Mañana';
    return format(date, 'EEE, d MMM', { locale: es });
  };

  const stats = [
    {
      title: 'Ganancias del Mes',
      value: `$${monthlyEarnings.toLocaleString()}`,
      icon: DollarSign,
      trend: '+12%',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Próximas Clases',
      value: upcomingBookings.length.toString(),
      icon: Calendar,
      trend: 'Esta semana',
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Total Estudiantes',
      value: totalStudents.toString(),
      icon: Users,
      trend: 'Histórico',
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Tarifa por Hora',
      value: `$${profile?.hourly_rate || 0}`,
      icon: TrendingUp,
      trend: 'Por sesión',
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            ¡Bienvenido, {profile?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Aquí está lo que sucede con tus clases hoy
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title} className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      {stat.trend}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upcoming Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Próximas Clases
            </CardTitle>
            <CardDescription>Tus próximas sesiones programadas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Sin clases próximas</p>
                <p className="text-sm text-muted-foreground">
                  Configura tu disponibilidad para comenzar a recibir reservas
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{booking.student?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getDateLabel(booking.booking_date)} a las {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                        className={booking.status === 'confirmed' ? 'bg-primary' : ''}
                      >
                        {booking.status === 'confirmed' ? 'Confirmado' : booking.status === 'pending' ? 'Pendiente' : booking.status}
                      </Badge>
                      <span className="font-semibold text-primary">
                        ${Number(booking.total_price).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
