import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useSpaInventory, useSpaBookings, useSpaServices, useSpaMutations } from '@/hooks/useDepartmentData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { Sparkles, DollarSign, Clock, AlertTriangle, Plus, Package, Calendar, BarChart3, MoreHorizontal, TrendingUp, Receipt, CreditCard, Trash2, Play, CheckCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SpaBooking } from '@/types/department';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

export default function SpaDashboard() {
  useOrderNotifications('spa', { enabled: true, soundEnabled: true });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: inventory = [] } = useSpaInventory();
  const { data: bookings = [] } = useSpaBookings('all');
  const { data: services = [] } = useSpaServices();
  const { settings } = useHotelSettings();
  const { deleteBooking, updateBookingStatus, updateBookingPayment } = useSpaMutations();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [selectedBooking, setSelectedBooking] = useState<SpaBooking | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash');

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => b.booking_date === today);
    const activeBookings = todayBookings.filter(b => ['scheduled', 'in_progress'].includes(b.status));
    const todayRevenue = todayBookings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + Number(b.total_amount), 0);
    const lowStockItems = inventory.filter(i => i.current_stock <= i.min_stock_level);
    const completedBookings = todayBookings.filter(b => b.status === 'completed');
    const avgBookingValue = completedBookings.length > 0 
      ? completedBookings.reduce((sum, b) => sum + Number(b.total_amount), 0) / completedBookings.length 
      : 0;

    return { 
      activeBookings: activeBookings.length, 
      todayRevenue, 
      pendingBookings: todayBookings.filter(b => b.status === 'scheduled').length, 
      lowStockItems: lowStockItems.length,
      totalBookings: todayBookings.length,
      completedBookings: completedBookings.length,
      avgBookingValue
    };
  }, [bookings, inventory]);

  const criticalLowStock = useMemo(() => {
    return inventory
      .filter(i => i.current_stock <= i.min_stock_level)
      .slice(0, 6);
  }, [inventory]);

  const bookingsByStatus = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => b.booking_date === today);
    return {
      scheduled: todayBookings.filter(b => b.status === 'scheduled').length,
      in_progress: todayBookings.filter(b => b.status === 'in_progress').length,
      completed: todayBookings.filter(b => b.status === 'completed').length,
      cancelled: todayBookings.filter(b => b.status === 'cancelled').length,
    };
  }, [bookings]);

  const recentBookings = bookings.slice(0, 8);

  const handlePaymentClick = async (booking: SpaBooking) => {
    setSelectedBooking(booking);
    setPaymentMode('cash');
    setShowPaymentDialog(true);
  };

  const handleDeleteClick = (booking: SpaBooking) => {
    setSelectedBooking(booking);
    setShowDeleteDialog(true);
  };

  const handleCollectPayment = async () => {
    if (!selectedBooking) return;
    
    try {
      await updateBookingPayment.mutateAsync({
        id: selectedBooking.id,
        payment_status: 'paid',
        payment_mode: paymentMode
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
    setShowPaymentDialog(false);
    setSelectedBooking(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedBooking) return;
    await deleteBooking.mutateAsync(selectedBooking.id);
    setShowDeleteDialog(false);
    setSelectedBooking(null);
  };

  const handleStatusChange = async (bookingId: string, status: string) => {
    await updateBookingStatus.mutateAsync({ id: bookingId, status });
  };

  const totalBookingsForProgress = bookingsByStatus.scheduled + bookingsByStatus.in_progress + bookingsByStatus.completed;

  return (
    <DashboardLayout title="Spa Dashboard" subtitle="Real-time overview of spa operations">
      {/* Quick Actions Bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Link to="/spa/bookings">
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </Link>
        <Link to="/spa/services">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Services
          </Button>
        </Link>
        <Link to="/spa/inventory">
          <Button variant="outline" className="gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </Button>
        </Link>
        <Link to="/spa/reports">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          label="Today's Revenue" 
          value={`${currencySymbol}${stats.todayRevenue.toLocaleString()}`} 
          icon={DollarSign} 
          iconClassName="text-emerald-500"
        />
        <StatCard 
          label="Active Bookings" 
          value={stats.activeBookings} 
          icon={Sparkles} 
          iconClassName="text-pink-500" 
        />
        <StatCard 
          label="Pending" 
          value={stats.pendingBookings} 
          icon={Clock} 
          iconClassName="text-amber-500" 
        />
        <StatCard 
          label="Avg Booking Value" 
          value={`${currencySymbol}${stats.avgBookingValue.toFixed(0)}`} 
          icon={TrendingUp} 
          iconClassName="text-purple-500" 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Bookings Table */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
            <div>
              <CardTitle className="text-lg font-semibold">Today's Bookings</CardTitle>
              <CardDescription>Real-time booking tracking and management</CardDescription>
            </div>
            <Link to="/spa/bookings">
              <Button variant="outline" size="sm">View All Bookings</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">No bookings yet today</p>
                <p className="text-sm text-muted-foreground">Bookings will appear here as they come in</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px]">Booking #</TableHead>
                    <TableHead>Therapist</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBookings.map((booking) => (
                    <TableRow key={booking.id} className="group">
                      <TableCell>
                        <div className="font-medium">{booking.booking_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {booking.start_time}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{booking.therapist_name || 'Unassigned'}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status} variant="booking" />
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={booking.payment_status === 'paid' ? 'default' : 'outline'}
                          className={booking.payment_status === 'pending' ? 'text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30' : ''}
                        >
                          {booking.payment_status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {currencySymbol}{booking.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {booking.payment_status === 'pending' && (
                              <DropdownMenuItem onClick={() => handlePaymentClick(booking)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Collect Payment
                              </DropdownMenuItem>
                            )}
                            {booking.status === 'scheduled' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'in_progress')}>
                                <Play className="h-4 w-4 mr-2" />
                                Start Session
                              </DropdownMenuItem>
                            )}
                            {booking.status === 'in_progress' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'completed')}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Complete
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(booking)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel Booking
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right Side Panel */}
        <div className="space-y-6">
          {/* Booking Status Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Booking Pipeline</CardTitle>
              <CardDescription>Today's booking flow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-sm">Scheduled</span>
                  </div>
                  <span className="font-semibold">{bookingsByStatus.scheduled}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-sm">In Progress</span>
                  </div>
                  <span className="font-semibold">{bookingsByStatus.in_progress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm">Completed</span>
                  </div>
                  <span className="font-semibold">{bookingsByStatus.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-sm">Cancelled</span>
                  </div>
                  <span className="font-semibold">{bookingsByStatus.cancelled}</span>
                </div>
              </div>
              {totalBookingsForProgress > 0 && (
                <div className="pt-3 border-t">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <span className="font-medium">
                      {((bookingsByStatus.completed / totalBookingsForProgress) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={(bookingsByStatus.completed / totalBookingsForProgress) * 100} 
                    className="h-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          {criticalLowStock.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Low Stock Alert
                </CardTitle>
                <CardDescription>Supplies running low</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {criticalLowStock.map(item => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-2.5 bg-red-50 dark:bg-red-950/20 rounded-lg"
                    >
                      <span className="text-sm font-medium truncate flex-1 mr-2">{item.name}</span>
                      <Badge variant="destructive" className="shrink-0">
                        {item.current_stock} {item.unit}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Link to="/spa/inventory" className="block mt-3">
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Inventory
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Today's Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{stats.totalBookings}</div>
                  <div className="text-xs text-muted-foreground">Total Bookings</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{stats.completedBookings}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg col-span-2">
                  <div className="text-2xl font-bold">{currencySymbol}{stats.todayRevenue.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Revenue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Services Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle className="text-lg font-semibold">Services Overview</CardTitle>
            <CardDescription>Quick view of service availability</CardDescription>
          </div>
          <Link to="/spa/services">
            <Button variant="outline" size="sm">Manage Services</Button>
          </Link>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {services.slice(0, 12).map(service => (
              <div 
                key={service.id} 
                className={`p-3 rounded-lg border text-center transition-colors ${
                  service.is_available 
                    ? 'bg-card hover:bg-muted/50' 
                    : 'bg-muted/30 opacity-60'
                }`}
              >
                <div className="font-medium text-sm truncate">{service.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {currencySymbol}{service.price}
                </div>
                <Badge 
                  variant={service.is_available ? 'default' : 'secondary'} 
                  className="mt-2 text-xs"
                >
                  {service.is_available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Collection Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>
              Collect payment for booking {selectedBooking?.booking_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between text-lg font-bold p-4 bg-muted rounded-lg">
              <span>Total Amount:</span>
              <span className="text-primary">{currencySymbol}{selectedBooking?.total_amount.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handleCollectPayment}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel booking {selectedBooking?.booking_number}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Keep Booking</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Cancel Booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
