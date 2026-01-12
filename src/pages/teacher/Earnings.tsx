import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Users, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface MonthlyData {
  month: string;
  earnings: number;
  bookings: number;
}

interface BookingData {
  booking_date: string;
  total_price: number;
  status: string;
  student_id: string;
}

export default function TeacherEarnings() {
  const { profile } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [averagePerBooking, setAveragePerBooking] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [uniqueStudents, setUniqueStudents] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);
  const [timeRange, setTimeRange] = useState('6');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchEarningsData();
    }
  }, [profile?.id, timeRange]);

  const fetchEarningsData = async () => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      const monthsBack = parseInt(timeRange);
      const startDate = startOfMonth(subMonths(new Date(), monthsBack - 1));
      
      const { data: bookings } = await supabase
        .from('bookings')
        .select('booking_date, total_price, status, student_id')
        .eq('teacher_id', profile.id)
        .eq('status', 'completed')
        .gte('booking_date', startDate.toISOString().split('T')[0])
        .order('booking_date', { ascending: true });

      if (bookings) {
        processBookingsData(bookings as BookingData[], monthsBack);
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processBookingsData = (bookings: BookingData[], monthsBack: number) => {
    // Create monthly buckets
    const monthlyMap = new Map<string, { earnings: number; bookings: number }>();
    
    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, 'MMM yyyy');
      monthlyMap.set(key, { earnings: 0, bookings: 0 });
    }

    // Fill in data
    let total = 0;
    const studentSet = new Set<string>();
    
    bookings.forEach((booking) => {
      const date = parseISO(booking.booking_date);
      const key = format(date, 'MMM yyyy');
      const current = monthlyMap.get(key);
      if (current) {
        current.earnings += Number(booking.total_price);
        current.bookings += 1;
      }
      total += Number(booking.total_price);
      studentSet.add(booking.student_id);
    });

    // Convert to array
    const dataArray: MonthlyData[] = [];
    monthlyMap.forEach((value, key) => {
      dataArray.push({
        month: key.split(' ')[0],
        earnings: value.earnings,
        bookings: value.bookings,
      });
    });

    setMonthlyData(dataArray);
    setTotalEarnings(total);
    setTotalBookings(bookings.length);
    setUniqueStudents(studentSet.size);
    setAveragePerBooking(bookings.length > 0 ? total / bookings.length : 0);

    // Calculate growth rate (compare last month to previous month)
    if (dataArray.length >= 2) {
      const lastMonth = dataArray[dataArray.length - 1].earnings;
      const prevMonth = dataArray[dataArray.length - 2].earnings;
      if (prevMonth > 0) {
        setGrowthRate(((lastMonth - prevMonth) / prevMonth) * 100);
      } else if (lastMonth > 0) {
        setGrowthRate(100);
      } else {
        setGrowthRate(0);
      }
    }
  };

  const stats = [
    {
      title: 'Total Earnings',
      value: `$${totalEarnings.toLocaleString()}`,
      icon: DollarSign,
      description: `Last ${timeRange} months`,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Growth Rate',
      value: `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`,
      icon: growthRate >= 0 ? TrendingUp : ArrowDownRight,
      description: 'vs. previous month',
      color: growthRate >= 0 ? 'text-success' : 'text-destructive',
      bgColor: growthRate >= 0 ? 'bg-success/10' : 'bg-destructive/10',
    },
    {
      title: 'Avg. per Booking',
      value: `$${averagePerBooking.toFixed(0)}`,
      icon: Calendar,
      description: `${totalBookings} total bookings`,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Unique Students',
      value: uniqueStudents.toString(),
      icon: Users,
      description: 'Returning customers',
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-primary text-sm">
            Earnings: ${payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const BookingsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-accent text-sm">
            Bookings: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Earnings Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Track your revenue and booking trends
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Monthly Revenue
              </CardTitle>
              <CardDescription>Your earnings over time</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorEarnings)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Bookings Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                Monthly Bookings
              </CardTitle>
              <CardDescription>Number of completed sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip content={<BookingsTooltip />} />
                    <Bar
                      dataKey="bookings"
                      fill="hsl(var(--accent))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}