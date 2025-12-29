import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useSpaBookings, useSpaServices, useSpaMutations } from '@/hooks/useDepartmentData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { useCheckedInGuests, CheckedInGuest } from '@/hooks/useCheckedInGuests';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import { useModuleAccess } from '@/hooks/usePermissions';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, Search, User, DoorOpen, X, Calendar, Clock, 
  CheckCircle, XCircle, PlayCircle, Sparkles, 
  CreditCard, Receipt, Printer, Eye, Edit, Trash2,
  Filter, RefreshCw, DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { SpaBooking, SpaService } from '@/types/department';
import { useToast } from '@/hooks/use-toast';

type BookingStatus = 'all' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
type PaymentFilter = 'all' | 'pending' | 'paid' | 'cancelled';

export default function SpaBookings() {
  const { data: bookings = [], isLoading: bookingsLoading, refetch } = useSpaBookings('all');
  const { data: services = [] } = useSpaServices();
  const { createBooking, updateBookingStatus, updateBookingPayment, deleteBooking } = useSpaMutations();
  const { settings } = useHotelSettings();
  const { calculateTaxForCategory } = useTaxSettings();
  const { toast } = useToast();
  const currencySymbol = settings?.currency_symbol || '₹';

  // Permission check
  const { canView, canCreate, canEdit, canDelete, loading: permLoading, isAdmin } = useModuleAccess('spa');

  // Filter states
  const [statusFilter, setStatusFilter] = useState<BookingStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<SpaBooking | null>(null);

  // Form state for new booking
  const [formData, setFormData] = useState({ 
    service_id: '', 
    booking_date: format(new Date(), 'yyyy-MM-dd'), 
    start_time: '10:00', 
    therapist_name: '', 
    notes: '' 
  });

  // Guest selection state
  const [guestSearch, setGuestSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<CheckedInGuest | null>(null);
  const [postToRoom, setPostToRoom] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  // Payment dialog state
  const [paymentMode, setPaymentMode] = useState('cash');

  const { data: checkedInGuests = [] } = useCheckedInGuests(guestSearch);

  // Calculate tax for spa services
  const calculateSpaTax = (amount: number) => {
    const taxItems = calculateTaxForCategory(amount, 'Spa');
    return taxItems.reduce((sum, item) => sum + item.amount, 0);
  };

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      // Status filter
      if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
      
      // Payment filter
      if (paymentFilter !== 'all' && booking.payment_status !== paymentFilter) return false;
      
      // Date filter
      if (dateFilter && booking.booking_date !== dateFilter) return false;
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesBookingNumber = booking.booking_number?.toLowerCase().includes(query);
        const matchesTherapist = booking.therapist_name?.toLowerCase().includes(query);
        return matchesBookingNumber || matchesTherapist;
      }
      
      return true;
    });
  }, [bookings, statusFilter, paymentFilter, dateFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayBookings = bookings.filter(b => b.booking_date === today);
    return {
      total: todayBookings.length,
      scheduled: todayBookings.filter(b => b.status === 'scheduled').length,
      inProgress: todayBookings.filter(b => b.status === 'in_progress').length,
      completed: todayBookings.filter(b => b.status === 'completed').length,
      revenue: todayBookings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + Number(b.total_amount), 0),
    };
  }, [bookings]);

  const handleSelectGuest = (guest: CheckedInGuest) => {
    setSelectedGuest(guest);
    setGuestSearch(guest.guestName);
    setShowGuestDropdown(false);
    setPostToRoom(true);
  };

  const handleClearGuest = () => {
    setSelectedGuest(null);
    setGuestSearch('');
    setPostToRoom(false);
  };

  const handleCreateBooking = async () => {
    const service = services.find(s => s.id === formData.service_id);
    if (!service) return;

    const subtotal = service.price;
    const taxAmount = calculateSpaTax(subtotal);
    const totalAmount = subtotal + taxAmount;

    const bookingData = { 
      ...formData, 
      service_id: formData.service_id,
      subtotal,
      tax_amount: taxAmount, 
      total_amount: totalAmount, 
      status: 'scheduled', 
      payment_status: postToRoom && selectedGuest ? 'pending' : 'pending',
      guest_id: selectedGuest?.guestId || null,
      room_id: postToRoom && selectedGuest ? selectedGuest.roomId : null,
    };

    await createBooking.mutateAsync(bookingData);
    setShowNewDialog(false);
    resetForm();
    toast({ title: 'Booking created successfully' });
  };

  const resetForm = () => {
    setFormData({ 
      service_id: '', 
      booking_date: format(new Date(), 'yyyy-MM-dd'), 
      start_time: '10:00', 
      therapist_name: '', 
      notes: '' 
    });
    handleClearGuest();
  };

  const handleStatusChange = async (booking: SpaBooking, newStatus: string) => {
    await updateBookingStatus.mutateAsync({ id: booking.id, status: newStatus });
    toast({ title: `Booking ${newStatus}` });
  };

  const handlePayment = async () => {
    if (!selectedBooking) return;
    
    try {
      // Update payment status to 'paid' with selected payment mode
      await updateBookingPayment.mutateAsync({ 
        id: selectedBooking.id, 
        payment_status: 'paid',
        payment_mode: paymentMode
      });
      
      setShowPaymentDialog(false);
      setSelectedBooking(null);
      setPaymentMode('cash');
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  const handleDelete = async (booking: SpaBooking) => {
    if (confirm('Are you sure you want to delete this booking?')) {
      await deleteBooking.mutateAsync(booking.id);
      toast({ title: 'Booking deleted' });
    }
  };

  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return 'Unknown Service';
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'in_progress': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'completed': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
      case 'pending': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Loading state
  if (permLoading || bookingsLoading) {
    return (
      <DashboardLayout title="Spa Bookings" subtitle="Manage spa appointments">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Permission check
  if (!canView && !isAdmin) {
    return (
      <DashboardLayout title="Spa Bookings" subtitle="Manage spa appointments">
        <AccessDenied 
          title="Access Denied" 
          message="You don't have permission to view Spa Bookings. Please contact your administrator."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Spa Bookings" subtitle="Manage spa appointments and scheduling">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Bookings</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold">{stats.scheduled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <PlayCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold">{currencySymbol}{stats.revenue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search booking # or therapist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-40"
              />

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentFilter)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {(canCreate || isAdmin) && (
              <Button onClick={() => { resetForm(); setShowNewDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />New Booking
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Bookings ({filteredBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-28rem)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking #</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Therapist</TableHead>
                  <TableHead>Guest / Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No bookings found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map(booking => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.booking_number}</TableCell>
                      <TableCell>{getServiceName(booking.service_id)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{booking.booking_date}</span>
                          <span className="text-xs text-muted-foreground">{booking.start_time}</span>
                        </div>
                      </TableCell>
                      <TableCell>{booking.therapist_name || '-'}</TableCell>
                      <TableCell>
                        {booking.room_id ? (
                          <Badge variant="outline" className="gap-1">
                            <DoorOpen className="h-3 w-3" />
                            Room Bill
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPaymentColor(booking.payment_status)}>
                          {booking.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {currencySymbol}{Number(booking.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {/* View */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => { setSelectedBooking(booking); setShowViewDialog(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Status Actions */}
                          {(canEdit || isAdmin) && booking.status === 'scheduled' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-amber-500 hover:text-amber-600"
                              onClick={() => handleStatusChange(booking, 'in_progress')}
                              title="Start Session"
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {(canEdit || isAdmin) && booking.status === 'in_progress' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-emerald-500 hover:text-emerald-600"
                              onClick={() => handleStatusChange(booking, 'completed')}
                              title="Complete Session"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Payment */}
                          {(canEdit || isAdmin) && booking.status === 'completed' && booking.payment_status === 'pending' && !booking.room_id && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary"
                              onClick={() => { setSelectedBooking(booking); setShowPaymentDialog(true); }}
                              title="Record Payment"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Cancel */}
                          {(canEdit || isAdmin) && booking.status === 'scheduled' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => handleStatusChange(booking, 'cancelled')}
                              title="Cancel Booking"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Delete */}
                          {(canDelete || isAdmin) && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(booking)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* New Booking Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              New Spa Booking
            </DialogTitle>
            <DialogDescription>Create a new spa appointment</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4">
            {/* Guest Search Section */}
            <div className="space-y-2">
              <Label>Guest (Optional - for room billing)</Label>
              {selectedGuest ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <User className="h-4 w-4 text-emerald-500" />
                  <div className="flex-1">
                    <p className="font-medium text-emerald-600">{selectedGuest.guestName}</p>
                    <p className="text-xs text-muted-foreground">Room {selectedGuest.roomNumber}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleClearGuest}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search checked-in guest by name or room..."
                    value={guestSearch}
                    onChange={(e) => {
                      setGuestSearch(e.target.value);
                      setShowGuestDropdown(true);
                    }}
                    onFocus={() => setShowGuestDropdown(true)}
                    className="pl-10"
                  />
                  {showGuestDropdown && guestSearch && checkedInGuests.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      {checkedInGuests.map((guest) => (
                        <button
                          key={guest.checkInId}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left"
                          onClick={() => handleSelectGuest(guest)}
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium">{guest.guestName}</p>
                            <p className="text-xs text-muted-foreground">{guest.guestPhone}</p>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <DoorOpen className="h-4 w-4" />
                            <span className="font-medium">{guest.roomNumber}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showGuestDropdown && guestSearch && checkedInGuests.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 p-3 text-center text-muted-foreground text-sm">
                      No checked-in guests found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Post to Room checkbox */}
            {selectedGuest && (
              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <Checkbox 
                  id="postToRoom" 
                  checked={postToRoom}
                  onCheckedChange={(checked) => setPostToRoom(checked as boolean)}
                />
                <Label htmlFor="postToRoom" className="cursor-pointer">
                  Post to Room Bill (collect at checkout)
                </Label>
              </div>
            )}

            <div className="space-y-2">
              <Label>Service *</Label>
              <Select value={formData.service_id} onValueChange={v => setFormData({ ...formData, service_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.filter(s => s.is_available).map(s => {
                    const tax = calculateSpaTax(s.price);
                    const total = s.price + tax;
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{s.name}</span>
                          <span className="text-muted-foreground">
                            {currencySymbol}{s.price} + {currencySymbol}{tax.toFixed(0)} tax = {currencySymbol}{total.toFixed(0)}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input 
                  type="date" 
                  value={formData.booking_date} 
                  onChange={e => setFormData({ ...formData, booking_date: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input 
                  type="time" 
                  value={formData.start_time} 
                  onChange={e => setFormData({ ...formData, start_time: e.target.value })} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Therapist Name</Label>
              <Input 
                value={formData.therapist_name} 
                onChange={e => setFormData({ ...formData, therapist_name: e.target.value })}
                placeholder="Assign a therapist" 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={formData.notes} 
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Special requests or notes..."
                rows={2}
              />
            </div>

            {/* Price Summary */}
            {formData.service_id && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  {(() => {
                    const service = services.find(s => s.id === formData.service_id);
                    if (!service) return null;
                    const subtotal = service.price;
                    const tax = calculateSpaTax(subtotal);
                    const total = subtotal + tax;
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal</span>
                          <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Tax (GST)</span>
                          <span>{currencySymbol}{tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t pt-2">
                          <span>Total</span>
                          <span>{currencySymbol}{total.toFixed(2)}</span>
                        </div>
                        {postToRoom && selectedGuest && (
                          <p className="text-xs text-primary pt-1">
                            → Will be added to Room {selectedGuest.roomNumber} bill
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateBooking} 
              disabled={!formData.service_id || createBooking.isPending}
            >
              {createBooking.isPending ? 'Creating...' : postToRoom && selectedGuest ? 'Create & Post to Room' : 'Create Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Booking Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Booking Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Booking Number</p>
                  <p className="font-semibold">{selectedBooking.booking_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className={getStatusColor(selectedBooking.status)}>
                    {selectedBooking.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{selectedBooking.booking_date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{selectedBooking.start_time}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="font-medium">{getServiceName(selectedBooking.service_id)}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Therapist</p>
                <p className="font-medium">{selectedBooking.therapist_name || 'Not assigned'}</p>
              </div>

              {selectedBooking.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{selectedBooking.notes}</p>
                </div>
              )}

              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{currencySymbol}{Number(selectedBooking.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax</span>
                    <span>{currencySymbol}{Number(selectedBooking.tax_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total</span>
                    <span>{currencySymbol}{Number(selectedBooking.total_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-sm text-muted-foreground">Payment Status</span>
                    <Badge variant="outline" className={getPaymentColor(selectedBooking.payment_status)}>
                      {selectedBooking.payment_status}
                    </Badge>
                  </div>
                  {selectedBooking.room_id && (
                    <p className="text-xs text-primary pt-1">
                      → Posted to room bill
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              {selectedBooking && `Booking: ${selectedBooking.booking_number}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className="text-3xl font-bold">{currencySymbol}{Number(selectedBooking.total_amount).toFixed(2)}</p>
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
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={updateBookingPayment.isPending}>Cancel</Button>
            <Button onClick={handlePayment} disabled={updateBookingPayment.isPending}>
              {updateBookingPayment.isPending ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
