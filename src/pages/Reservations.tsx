import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar as CalendarIcon, Search, Eye, Edit, X, Check, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Reservation, Guest, RoomType, ReservationStatus } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { Textarea } from '@/components/ui/textarea';

export default function Reservations() {
  const { hasPermission, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New reservation form
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date>();
  const [checkOutDate, setCheckOutDate] = useState<Date>();
  const [numAdults, setNumAdults] = useState('1');
  const [numChildren, setNumChildren] = useState('0');
  const [specialRequests, setSpecialRequests] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('0');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [reservationsRes, guestsRes, roomTypesRes] = await Promise.all([
        supabase.from('reservations').select('*').order('created_at', { ascending: false }),
        supabase.from('guests').select('*'),
        supabase.from('room_types').select('*').eq('is_active', true),
      ]);

      if (reservationsRes.data) setReservations(reservationsRes.data as Reservation[]);
      if (guestsRes.data) setGuests(guestsRes.data as Guest[]);
      if (roomTypesRes.data) setRoomTypes(roomTypesRes.data as RoomType[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!checkInDate || !checkOutDate) {
        toast({ title: 'Error', description: 'Please select check-in and check-out dates.', variant: 'destructive' });
        return;
      }

      // Create or find guest
      let guestId: string;
      const existingGuest = guests.find(g => g.phone === guestPhone);
      
      if (existingGuest) {
        guestId = existingGuest.id;
      } else {
        const nameParts = guestName.trim().split(' ');
        const firstName = nameParts[0] || guestName;
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const { data: newGuest, error: guestError } = await supabase
          .from('guests')
          .insert([{ first_name: firstName, last_name: lastName, full_name: guestName, phone: guestPhone, email: guestEmail || null }])
          .select()
          .single();
        
        if (guestError) throw guestError;
        guestId = newGuest.id;
      }

      // Generate reservation number
      const { data: resNumber } = await supabase.rpc('generate_reservation_number');

      // Calculate total
      const roomType = roomTypes.find(rt => rt.id === selectedRoomType);
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = roomType ? roomType.base_price * nights : 0;

      // Create reservation
      const { error } = await supabase.from('reservations').insert({
        reservation_number: resNumber,
        guest_id: guestId,
        room_type_id: selectedRoomType || null,
        check_in_date: format(checkInDate, 'yyyy-MM-dd'),
        check_out_date: format(checkOutDate, 'yyyy-MM-dd'),
        num_adults: parseInt(numAdults),
        num_children: parseInt(numChildren),
        num_guests: parseInt(numAdults) + parseInt(numChildren),
        special_requests: specialRequests || null,
        advance_amount: parseFloat(advanceAmount) || 0,
        total_amount: totalAmount,
        status: 'confirmed',
      });

      if (error) throw error;

      toast({ title: 'Reservation Created!', description: `Reservation ${resNumber} confirmed.` });
      
      // Reset form
      setGuestName('');
      setGuestPhone('');
      setGuestEmail('');
      setSelectedRoomType('');
      setCheckInDate(undefined);
      setCheckOutDate(undefined);
      setNumAdults('1');
      setNumChildren('0');
      setSpecialRequests('');
      setAdvanceAmount('0');
      setIsDialogOpen(false);
      
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: ReservationStatus) => {
    try {
      const { error } = await supabase.from('reservations').update({ status }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Status Updated' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: ReservationStatus) => {
    const styles: Record<string, string> = {
      pending: 'bg-warning/20 text-warning-foreground border-warning',
      confirmed: 'bg-info/20 text-info-foreground border-info',
      checked_in: 'bg-success/20 text-success-foreground border-success',
      completed: 'bg-muted text-muted-foreground',
      cancelled: 'bg-destructive/20 text-destructive border-destructive',
      no_show: 'bg-destructive/20 text-destructive border-destructive',
    };
    return <Badge variant="outline" className={styles[status]}>{status.replace('_', ' ')}</Badge>;
  };

  const filteredReservations = reservations.filter(res => {
    const matchesTab = activeTab === 'all' || res.status === activeTab;
    const guest = guests.find(g => g.id === res.guest_id);
    const matchesSearch = !searchQuery || 
      res.reservation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest?.phone.includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  return (
    <DashboardLayout title="Reservations" subtitle="Manage hotel reservations" requiredModule="reservations">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reservations..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {(isAdmin || hasPermission('reservations', 'create')) && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" />New Reservation</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Reservation</DialogTitle>
                  <DialogDescription>Create a new room reservation.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateReservation} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Guest Name *</Label>
                      <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Room Type *</Label>
                    <Select value={selectedRoomType} onValueChange={setSelectedRoomType} required>
                      <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                      <SelectContent>
                        {roomTypes.map(rt => (
                          <SelectItem key={rt.id} value={rt.id}>{rt.name} - ₹{rt.base_price}/night</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Check-in Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start", !checkInDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {checkInDate ? format(checkInDate, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={checkInDate} onSelect={setCheckInDate} /></PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Check-out Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start", !checkOutDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {checkOutDate ? format(checkOutDate, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={checkOutDate} onSelect={setCheckOutDate} /></PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Adults</Label>
                      <Input type="number" min="1" value={numAdults} onChange={(e) => setNumAdults(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Children</Label>
                      <Input type="number" min="0" value={numChildren} onChange={(e) => setNumChildren(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Advance Amount (₹)</Label>
                    <Input type="number" min="0" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Special Requests</Label>
                    <Textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Reservation'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="checked_in">Checked In</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Table */}
        <Card className="shadow-soft">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-1">No Reservations</h3>
                <p className="text-muted-foreground text-sm">Create your first reservation.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Res. No.</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.map((res) => {
                    const guest = guests.find(g => g.id === res.guest_id);
                    const roomType = roomTypes.find(rt => rt.id === res.room_type_id);
                    return (
                      <TableRow key={res.id}>
                        <TableCell className="font-mono text-sm">{res.reservation_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{guest?.full_name || '-'}</p>
                            <p className="text-xs text-muted-foreground">{guest?.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{roomType?.name || '-'}</TableCell>
                        <TableCell>{format(new Date(res.check_in_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{format(new Date(res.check_out_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{res.num_adults}A + {res.num_children}C</TableCell>
                        <TableCell>₹{res.total_amount?.toLocaleString() || 0}</TableCell>
                        <TableCell>{getStatusBadge(res.status as ReservationStatus)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {res.status === 'confirmed' && (
                              <Button size="sm" variant="ghost" onClick={() => updateStatus(res.id, 'checked_in')}>
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {res.status === 'pending' && (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => updateStatus(res.id, 'confirmed')}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => updateStatus(res.id, 'cancelled')}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}