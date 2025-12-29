import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, DoorOpen, Search, Edit, Trash2 } from 'lucide-react';
import { Room, RoomType, RoomStatus } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export default function Rooms() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  // New room form
  const [roomNumber, setRoomNumber] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [floor, setFloor] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, roomTypesRes] = await Promise.all([
        supabase.from('rooms').select('*').order('room_number'),
        supabase.from('room_types').select('*'),
      ]);
      if (roomsRes.data) setRooms(roomsRes.data as Room[]);
      if (roomTypesRes.data) setRoomTypes(roomTypesRes.data as RoomType[]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('rooms').insert([{
        room_number: roomNumber,
        room_type_id: roomTypeId || null,
        floor: floor ? parseInt(floor) : null,
        status: 'available',
      }]);
      if (error) throw error;
      toast({ title: 'Room Created!' });
      setRoomNumber('');
      setRoomTypeId('');
      setFloor('');
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateRoomStatus = async (roomId: string, status: string) => {
    try {
      const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId);
      if (error) throw error;
      toast({ title: 'Status Updated' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-status-available',
      occupied: 'bg-status-occupied',
      reserved: 'bg-status-reserved',
      cleaning: 'bg-status-cleaning',
      maintenance: 'bg-status-maintenance',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusBgColor = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-50 border-green-200',
      occupied: 'bg-red-50 border-red-200',
      reserved: 'bg-yellow-50 border-yellow-200',
      cleaning: 'bg-blue-50 border-blue-200',
      maintenance: 'bg-purple-50 border-purple-200',
    };
    return colors[status] || 'bg-gray-50 border-gray-200';
  };

  const filteredRooms = rooms.filter(room => {
    const matchesStatus = filterStatus === 'all' || room.status === filterStatus;
    const matchesType = filterType === 'all' || room.room_type_id === filterType;
    return matchesStatus && matchesType;
  });

  const statusCounts = {
    available: rooms.filter(r => r.status === 'available').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    reserved: rooms.filter(r => r.status === 'reserved').length,
    cleaning: rooms.filter(r => r.status === 'cleaning').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
  };

  return (
    <DashboardLayout title="Room Status" subtitle="Manage rooms and their status" requiredModule="rooms">
      <div className="space-y-6 animate-fade-in">
        {/* Status Legend */}
        <div className="flex flex-wrap gap-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={cn('w-4 h-4 rounded', getStatusColor(status as RoomStatus))} />
              <span className="text-sm capitalize">{status}: {count}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 justify-between">
          <div className="flex gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Filter by type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {roomTypes.map(rt => (
                  <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" />Add Room</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Room</DialogTitle>
                  <DialogDescription>Create a new room in the system.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateRoom} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Room Number *</Label>
                    <Input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} required placeholder="e.g., 101" />
                  </div>
                  <div className="space-y-2">
                    <Label>Room Type</Label>
                    <Select value={roomTypeId} onValueChange={setRoomTypeId}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {roomTypes.map(rt => (
                          <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Floor</Label>
                    <Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g., 1" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Room'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Room Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <DoorOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-1">No Rooms</h3>
            <p className="text-muted-foreground text-sm">Add your first room.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredRooms.map(room => {
              const roomType = roomTypes.find(rt => rt.id === room.room_type_id);
              return (
                <Card key={room.id} className={cn('border-2 transition-all hover:shadow-md cursor-pointer', getStatusBgColor(room.status))}>
                  <CardContent className="p-4">
                    <div className={cn('w-full h-2 rounded-full mb-3', getStatusColor(room.status))} />
                    <h3 className="font-bold text-xl mb-1">{room.room_number}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{roomType?.name || 'No Type'}</p>
                    {room.floor && <p className="text-xs text-muted-foreground">Floor {room.floor}</p>}
                    <Badge variant="outline" className="mt-2 capitalize text-xs">{room.status}</Badge>
                    
                    {/* Quick Actions */}
                    <div className="mt-3 flex gap-1 flex-wrap">
                      {room.status === 'available' && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateRoomStatus(room.id, 'reserved')}>Reserve</Button>
                      )}
                      {room.status === 'occupied' && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateRoomStatus(room.id, 'cleaning')}>Check-out</Button>
                      )}
                      {room.status === 'cleaning' && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateRoomStatus(room.id, 'available')}>Ready</Button>
                      )}
                      {room.status === 'reserved' && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateRoomStatus(room.id, 'available')}>Cancel</Button>
                      )}
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