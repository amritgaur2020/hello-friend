import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Users, DoorOpen, Receipt, Calendar } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalGuests: 0,
    totalCheckIns: 0,
    occupancyRate: 0,
    avgStayDuration: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      let startDate: Date;
      const endDate = new Date();
      
      if (period === 'week') startDate = subDays(endDate, 7);
      else if (period === 'month') startDate = startOfMonth(endDate);
      else startDate = new Date(endDate.getFullYear(), 0, 1);

      const [billingRes, guestsRes, checkInsRes, roomsRes] = await Promise.all([
        supabase.from('billing').select('total_amount, paid_amount, created_at').gte('created_at', startDate.toISOString()),
        supabase.from('guests').select('id, created_at').gte('created_at', startDate.toISOString()),
        supabase.from('check_ins').select('id, check_in_time, expected_check_out').gte('check_in_time', startDate.toISOString()),
        supabase.from('rooms').select('id, status'),
      ]);

      const billings = billingRes.data || [];
      const guests = guestsRes.data || [];
      const checkIns = checkInsRes.data || [];
      const rooms = roomsRes.data || [];

      const totalRevenue = billings.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
      const pendingPayments = billings.reduce((sum, b) => sum + ((b.total_amount || 0) - (b.paid_amount || 0)), 0);
      const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
      const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;

      // Calculate avg stay duration
      let totalDays = 0;
      checkIns.forEach(ci => {
        const checkIn = new Date(ci.check_in_time);
        const checkOut = new Date(ci.expected_check_out);
        totalDays += Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      });
      const avgStayDuration = checkIns.length > 0 ? Math.round(totalDays / checkIns.length) : 0;

      setStats({
        totalRevenue,
        totalGuests: guests.length,
        totalCheckIns: checkIns.length,
        occupancyRate,
        avgStayDuration,
        pendingPayments,
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'stat-card-green' },
    { label: 'Total Guests', value: stats.totalGuests, icon: Users, color: 'stat-card-blue' },
    { label: 'Check-ins', value: stats.totalCheckIns, icon: Calendar, color: 'stat-card-peach' },
    { label: 'Occupancy Rate', value: `${stats.occupancyRate}%`, icon: DoorOpen, color: 'stat-card-yellow' },
    { label: 'Avg Stay Duration', value: `${stats.avgStayDuration} days`, icon: Calendar, color: 'stat-card-purple' },
    { label: 'Pending Payments', value: `₹${stats.pendingPayments.toLocaleString()}`, icon: Receipt, color: 'stat-card-coral' },
  ];

  return (
    <DashboardLayout title="Reports" subtitle="View hotel performance metrics" requiredModule="reports">
      <div className="space-y-6 animate-fade-in">
        {/* Period Selector */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Performance Overview</h2>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {statCards.map((stat, index) => (
              <Card key={index} className={`${stat.color} border-0 shadow-soft`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-80">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Additional Info */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Quick Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Most Popular Room Type</p>
                <p className="font-semibold mt-1">Double Room</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Peak Check-in Day</p>
                <p className="font-semibold mt-1">Saturday</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Average Bill Amount</p>
                <p className="font-semibold mt-1">₹{stats.totalCheckIns > 0 ? Math.round(stats.totalRevenue / stats.totalCheckIns).toLocaleString() : 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="font-semibold mt-1">{stats.totalRevenue > 0 ? Math.round((stats.totalRevenue / (stats.totalRevenue + stats.pendingPayments)) * 100) : 100}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}