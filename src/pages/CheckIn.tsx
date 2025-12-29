import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, User, Phone, Mail, MapPin, CreditCard, Upload } from 'lucide-react';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Room, RoomType, Guest } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { Textarea } from '@/components/ui/textarea';

export default function CheckIn() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Guest form
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [guestCity, setGuestCity] = useState('');
  const [guestState, setGuestState] = useState('');
  const [guestPincode, setGuestPincode] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  
  // Room selection
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date>(new Date());
  const [checkOutDate, setCheckOutDate] = useState<Date>(addDays(new Date(), 1));
  const [numGuests, setNumGuests] = useState('1');
  const [notes, setNotes] = useState('');
  
  // Payment
  const [advancePayment, setAdvancePayment] = useState('0');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, roomTypesRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('status', 'available'),
        supabase.from('room_types').select('*').eq('is_active', true),
      ]);
      if (roomsRes.data) setRooms(roomsRes.data as unknown as Room[]);
      if (roomTypesRes.data) setRoomTypes(roomTypesRes.data as RoomType[]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableRooms = rooms.filter(r => 
    r.status === 'available' && 
    (!selectedRoomType || r.room_type_id === selectedRoomType)
  );

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!selectedRoom) {
        toast({ title: 'Error', description: 'Please select a room.', variant: 'destructive' });
        return;
      }

      // Create guest - use first_name and last_name per database schema
      const nameParts = guestName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || firstName;
      
      const { data: guest, error: guestError } = await supabase.from('guests').insert([{
        first_name: firstName,
        last_name: lastName,
        full_name: guestName,
        phone: guestPhone,
        email: guestEmail || null,
        address: guestAddress || null,
        id_type: idType || null,
        id_number: idNumber || null,
      }]).select().single();

      if (guestError) throw guestError;

      // Create check-in - use selected check-in date, not current time
      const { error: checkInError } = await supabase.from('check_ins').insert([{
        guest_id: guest.id,
        room_id: selectedRoom,
        check_in_time: checkInDate.toISOString(),
        expected_check_out: checkOutDate.toISOString(),
        notes: notes || null,
        status: 'checked_in',
        num_guests: parseInt(numGuests) || 1,
      }]);

      if (checkInError) throw checkInError;

      // Update room status
      await supabase.from('rooms').update({ status: 'occupied' }).eq('id', selectedRoom);

      // Create billing if advance payment
      if (parseFloat(advancePayment) > 0) {
        const roomType = roomTypes.find(rt => rt.id === rooms.find(r => r.id === selectedRoom)?.room_type_id);
        const nights = Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate));
        const totalAmount = roomType ? roomType.base_price * nights : 0;

        await supabase.from('billing').insert([{
          guest_id: guest.id,
          total_amount: totalAmount,
          paid_amount: parseFloat(advancePayment),
          status: parseFloat(advancePayment) >= totalAmount ? 'paid' : 'partial',
        }]);
      }

      toast({ title: 'Check-in Successful!', description: `${guestName} checked into Room ${rooms.find(r => r.id === selectedRoom)?.room_number}` });
      
      // Reset form
      setGuestName('');
      setGuestPhone('');
      setGuestEmail('');
      setGuestAddress('');
      setGuestCity('');
      setGuestState('');
      setGuestPincode('');
      setIdType('');
      setIdNumber('');
      setSelectedRoomType('');
      setSelectedRoom('');
      setCheckInDate(new Date());
      setCheckOutDate(addDays(new Date(), 1));
      setNumGuests('1');
      setNotes('');
      setAdvancePayment('0');
      
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Check-in" requiredModule="check_in">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Check-in" subtitle="Register new guest check-in" requiredModule="check_in">
      <form onSubmit={handleCheckIn} className="space-y-6 animate-fade-in">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Guest Information */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
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
                <Label>Address</Label>
                <Textarea value={guestAddress} onChange={(e) => setGuestAddress(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={guestCity} onChange={(e) => setGuestCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={guestState} onChange={(e) => setGuestState(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input value={guestPincode} onChange={(e) => setGuestPincode(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID Type</Label>
                  <Select value={idType} onValueChange={setIdType}>
                    <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aadhar">Aadhar Card</SelectItem>
                      <SelectItem value="pan">PAN Card</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="driving_license">Driving License</SelectItem>
                      <SelectItem value="voter_id">Voter ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ID Number</Label>
                  <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Room Assignment */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Room Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Room Type *</Label>
                <Select value={selectedRoomType} onValueChange={(v) => { setSelectedRoomType(v); setSelectedRoom(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                  <SelectContent>
                    {roomTypes.map(rt => (
                      <SelectItem key={rt.id} value={rt.id}>{rt.name} - ₹{rt.base_price}/night</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Available Room *</Label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>
                    {availableRooms.length === 0 ? (
                      <SelectItem value="-" disabled>No rooms available</SelectItem>
                    ) : (
                      availableRooms.map(room => (
                        <SelectItem key={room.id} value={room.id}>Room {room.room_number} {room.floor ? `(Floor ${room.floor})` : ''}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check-in Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(checkInDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={checkInDate} onSelect={(d) => d && setCheckInDate(d)} /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Check-out Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(checkOutDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={checkOutDate} onSelect={(d) => d && setCheckOutDate(d)} /></PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Number of Guests</Label>
                  <Input type="number" min="1" value={numGuests} onChange={(e) => setNumGuests(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Advance Payment (₹)</Label>
                  <Input type="number" min="0" value={advancePayment} onChange={(e) => setAdvancePayment(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              {/* Nights & Billing Preview */}
              {selectedRoomType && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                  <h4 className="font-semibold mb-2 text-sm">Stay Preview</h4>
                  {(() => {
                    const roomType = roomTypes.find(rt => rt.id === selectedRoomType);
                    const nights = Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate));
                    const roomCharges = roomType ? roomType.base_price * nights : 0;
                    return (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Check-in:</span>
                          <span>{format(checkInDate, 'dd MMM yyyy')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Check-out:</span>
                          <span>{format(checkOutDate, 'dd MMM yyyy')}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Number of Nights:</span>
                          <span>{nights}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Room Rate:</span>
                          <span>₹{roomType?.base_price || 0}/night</span>
                        </div>
                        <div className="flex justify-between font-semibold pt-2 border-t">
                          <span>Estimated Room Charges:</span>
                          <span>₹{roomCharges.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" size="lg" className="gap-2" disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Complete Check-in'}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}