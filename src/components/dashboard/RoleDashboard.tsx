import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/shared/StatCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  CalendarCheck, 
  DoorOpen, 
  Users, 
  Receipt,
  Clock,
  Plus,
  Bed,
  Coffee,
  Shield,
  Wrench,
  Sparkles,
  Car,
  Moon,
  UtensilsCrossed,
  ChefHat,
  Dumbbell,
  Clipboard,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface RoleDashboardProps {
  roleName: string;
  departmentName?: string;
}

// Admin & Manager Dashboard
function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [checkIns, rooms, reservations, billing] = await Promise.all([
        supabase.from('check_ins').select('id', { count: 'exact' }).gte('check_in_time', today),
        supabase.from('rooms').select('status'),
        supabase.from('reservations').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('billing').select('total_amount').eq('status', 'pending'),
      ]);

      const occupiedRooms = rooms.data?.filter(r => r.status === 'occupied').length || 0;
      const totalRooms = rooms.data?.length || 1;
      const pendingAmount = billing.data?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;

      return {
        todayCheckIns: checkIns.count || 0,
        occupancy: Math.round((occupiedRooms / totalRooms) * 100),
        pendingReservations: reservations.count || 0,
        pendingPayments: pendingAmount,
      };
    },
  });

  const statCards = [
    { label: "Today's Check-ins", value: stats?.todayCheckIns || 0, icon: CalendarCheck, color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Room Occupancy', value: `${stats?.occupancy || 0}%`, icon: DoorOpen, color: 'bg-amber-500/10 text-amber-600' },
    { label: 'Pending Reservations', value: stats?.pendingReservations || 0, icon: Clock, color: 'bg-rose-500/10 text-rose-600' },
    { label: 'Pending Payments', value: `₹${(stats?.pendingPayments || 0).toLocaleString()}`, icon: Receipt, color: 'bg-emerald-500/10 text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <Link to="/check-in"><Plus className="h-4 w-4" />New Check-in</Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to="/reservations"><CalendarCheck className="h-4 w-4" />New Reservation</Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to="/billing"><Receipt className="h-4 w-4" />Create Invoice</Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to="/guests"><Users className="h-4 w-4" />Add Guest</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Front Desk Dashboard
function FrontDeskDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['front-desk-dashboard-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [checkIns, checkOuts, reservations, rooms] = await Promise.all([
        supabase.from('check_ins').select('id', { count: 'exact' }).gte('check_in_time', today),
        supabase.from('check_ins').select('id', { count: 'exact' }).gte('expected_check_out', today).lte('expected_check_out', today),
        supabase.from('reservations').select('id', { count: 'exact' }).eq('check_in_date', today),
        supabase.from('rooms').select('status').eq('status', 'available'),
      ]);

      return {
        todayCheckIns: checkIns.count || 0,
        todayCheckOuts: checkOuts.count || 0,
        arrivingToday: reservations.count || 0,
        availableRooms: rooms.data?.length || 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Check-ins" value={stats?.todayCheckIns || 0} icon={CalendarCheck} color="blue" />
        <StatCard label="Today's Check-outs" value={stats?.todayCheckOuts || 0} icon={DoorOpen} color="amber" />
        <StatCard label="Arriving Today" value={stats?.arrivingToday || 0} icon={Users} color="rose" />
        <StatCard label="Available Rooms" value={stats?.availableRooms || 0} icon={Bed} color="emerald" />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <Link to="/check-in"><Plus className="h-4 w-4" />New Check-in</Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to="/reservations"><CalendarCheck className="h-4 w-4" />New Reservation</Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to="/guests"><Users className="h-4 w-4" />Guest Lookup</Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to="/rooms"><Bed className="h-4 w-4" />Room Status</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Housekeeping Dashboard
function HousekeepingDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['housekeeping-dashboard-stats'],
    queryFn: async () => {
      const rooms = await supabase.from('rooms').select('status');
      
      const cleaning = rooms.data?.filter(r => r.status === 'cleaning').length || 0;
      const maintenance = rooms.data?.filter(r => r.status === 'maintenance').length || 0;
      const available = rooms.data?.filter(r => r.status === 'available').length || 0;
      const occupied = rooms.data?.filter(r => r.status === 'occupied').length || 0;

      return { cleaning, maintenance, available, occupied };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rooms to Clean" value={stats?.cleaning || 0} icon={Sparkles} color="amber" />
        <StatCard label="Under Maintenance" value={stats?.maintenance || 0} icon={Wrench} color="rose" />
        <StatCard label="Ready Rooms" value={stats?.available || 0} icon={CheckCircle2} color="emerald" />
        <StatCard label="Occupied" value={stats?.occupied || 0} icon={DoorOpen} color="blue" />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <Link to="/rooms"><Sparkles className="h-4 w-4" />View Room Status</Link>
            </Button>
            <Button variant="outline" className="gap-2">
              <Clipboard className="h-4 w-4" />My Tasks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Security Dashboard
function SecurityDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Guests" value={0} icon={Users} color="blue" />
        <StatCard label="Today's Incidents" value={0} icon={AlertTriangle} color="amber" />
        <StatCard label="Patrol Completed" value={0} icon={Shield} color="emerald" />
        <StatCard label="Pending Reports" value={0} icon={Clipboard} color="rose" />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2">
              <AlertTriangle className="h-4 w-4" />Log Incident
            </Button>
            <Button variant="outline" className="gap-2">
              <Shield className="h-4 w-4" />Record Patrol
            </Button>
            <Button variant="outline" className="gap-2">
              <Clipboard className="h-4 w-4" />View Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Bar / Restaurant Dashboard
function BarRestaurantDashboard({ type }: { type: 'bar' | 'restaurant' }) {
  const icon = type === 'bar' ? Coffee : UtensilsCrossed;
  const title = type === 'bar' ? 'Bar' : 'Restaurant';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Orders" value={0} icon={icon} color="blue" />
        <StatCard label="Pending Bills" value={0} icon={Receipt} color="amber" />
        <StatCard label="Today's Revenue" value="₹0" icon={Receipt} color="emerald" />
        <StatCard label="Inventory Alerts" value={0} icon={AlertTriangle} color="rose" />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">{title} Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />New Order
            </Button>
            <Button variant="outline" className="gap-2">
              <Receipt className="h-4 w-4" />Pending Bills
            </Button>
            <Button variant="outline" className="gap-2">
              <Clipboard className="h-4 w-4" />Inventory
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Kitchen Dashboard
function KitchenDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending Orders" value={0} icon={ChefHat} color="rose" />
        <StatCard label="In Progress" value={0} icon={Clock} color="amber" />
        <StatCard label="Completed Today" value={0} icon={CheckCircle2} color="emerald" />
        <StatCard label="Inventory Alerts" value={0} icon={AlertTriangle} color="blue" />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Kitchen Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2">
              <Clipboard className="h-4 w-4" />View Orders
            </Button>
            <Button variant="outline" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />Mark Complete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Spa & Wellness Dashboard
function SpaDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Bookings" value={0} icon={Dumbbell} color="blue" />
        <StatCard label="Active Sessions" value={0} icon={Clock} color="amber" />
        <StatCard label="Available Slots" value={0} icon={CheckCircle2} color="emerald" />
        <StatCard label="Pending Payments" value={0} icon={Receipt} color="rose" />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Spa Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />New Booking
            </Button>
            <Button variant="outline" className="gap-2">
              <Clipboard className="h-4 w-4" />View Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Maintenance Dashboard
function MaintenanceDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open Tickets" value={0} icon={Wrench} color="rose" />
        <StatCard label="In Progress" value={0} icon={Clock} color="amber" />
        <StatCard label="Completed Today" value={0} icon={CheckCircle2} color="emerald" />
        <StatCard label="Rooms Under Maint." value={0} icon={DoorOpen} color="blue" />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Maintenance Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />Create Ticket
            </Button>
            <Button variant="outline" className="gap-2">
              <Clipboard className="h-4 w-4" />View All Tickets
            </Button>
            <Button variant="outline" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />Mark Complete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Valet Dashboard
function ValetDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Parked Vehicles" value={0} icon={Car} color="blue" />
        <StatCard label="Pending Pickups" value={0} icon={Clock} color="amber" />
        <StatCard label="Today's Services" value={0} icon={CheckCircle2} color="emerald" />
        <StatCard label="Available Spots" value={0} icon={DoorOpen} color="rose" />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Valet Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />Park Vehicle
            </Button>
            <Button variant="outline" className="gap-2">
              <Car className="h-4 w-4" />Retrieve Vehicle
            </Button>
            <Button variant="outline" className="gap-2">
              <Clipboard className="h-4 w-4" />View Log
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Night Auditor Dashboard
function NightAuditorDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending Bills" value={0} icon={Receipt} color="rose" />
        <StatCard label="Discrepancies" value={0} icon={AlertTriangle} color="amber" />
        <StatCard label="Rooms Occupied" value={0} icon={DoorOpen} color="blue" />
        <StatCard label="Night Revenue" value="₹0" icon={Moon} color="emerald" />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">Night Audit Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2">
              <Clipboard className="h-4 w-4" />Run Audit
            </Button>
            <Button variant="outline" className="gap-2">
              <Receipt className="h-4 w-4" />Review Bills
            </Button>
            <Button variant="outline" className="gap-2">
              <Moon className="h-4 w-4" />Night Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


// Main component that routes to the appropriate dashboard
export function RoleDashboard({ roleName, departmentName }: RoleDashboardProps) {
  // Map role names to dashboard components
  switch (roleName) {
    case 'admin':
    case 'manager':
      return <AdminDashboard />;
    case 'front_desk':
      return <FrontDeskDashboard />;
    case 'housekeeping':
      return <HousekeepingDashboard />;
    case 'security_guard':
      return <SecurityDashboard />;
    case 'bar_tender':
    case 'bartender':
      return <BarRestaurantDashboard type="bar" />;
    case 'restaurant_staff':
    case 'waiter':
      return <BarRestaurantDashboard type="restaurant" />;
    case 'kitchen_staff':
    case 'chef':
      return <KitchenDashboard />;
    case 'spa_attendant':
    case 'pool_attendant':
      return <SpaDashboard />;
    case 'maintenance_staff':
      return <MaintenanceDashboard />;
    case 'valet':
      return <ValetDashboard />;
    case 'night_auditor':
      return <NightAuditorDashboard />;
    case 'concierge':
    case 'bellboy':
      return <FrontDeskDashboard />;
    default:
      // For unknown roles, check department name
      if (departmentName?.toLowerCase().includes('bar')) {
        return <BarRestaurantDashboard type="bar" />;
      }
      if (departmentName?.toLowerCase().includes('restaurant')) {
        return <BarRestaurantDashboard type="restaurant" />;
      }
      if (departmentName?.toLowerCase().includes('kitchen')) {
        return <KitchenDashboard />;
      }
      if (departmentName?.toLowerCase().includes('security')) {
        return <SecurityDashboard />;
      }
      if (departmentName?.toLowerCase().includes('spa') || departmentName?.toLowerCase().includes('wellness')) {
        return <SpaDashboard />;
      }
      if (departmentName?.toLowerCase().includes('maintenance')) {
        return <MaintenanceDashboard />;
      }
      if (departmentName?.toLowerCase().includes('parking') || departmentName?.toLowerCase().includes('valet')) {
        return <ValetDashboard />;
      }
      // Default to front desk dashboard for unknown roles
      return <FrontDeskDashboard />;
  }
}
