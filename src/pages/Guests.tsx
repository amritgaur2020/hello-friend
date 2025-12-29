import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Eye, Phone, Mail, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Guest } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Guests() {
  const { toast } = useToast();
  
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('guests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setGuests(data as Guest[]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGuests = guests.filter(guest => 
    !searchQuery || 
    guest.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guest.phone.includes(searchQuery) ||
    guest.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title="Guest History" subtitle="View and manage guest records" requiredModule="guests">
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card-blue shadow-soft">
            <CardContent className="p-6">
              <p className="text-sm font-medium opacity-80">Total Guests</p>
              <p className="text-2xl font-bold">{guests.length}</p>
            </CardContent>
          </Card>
          <Card className="stat-card-green shadow-soft">
            <CardContent className="p-6">
              <p className="text-sm font-medium opacity-80">Repeat Guests</p>
              <p className="text-2xl font-bold">{guests.filter(g => g.total_visits > 1).length}</p>
            </CardContent>
          </Card>
          <Card className="stat-card-peach shadow-soft">
            <CardContent className="p-6">
              <p className="text-sm font-medium opacity-80">This Month</p>
              <p className="text-2xl font-bold">{guests.filter(g => new Date(g.created_at).getMonth() === new Date().getMonth()).length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search guests..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Table */}
        <Card className="shadow-soft">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-1">No Guests</h3>
                <p className="text-muted-foreground text-sm">Guest records will appear after check-ins.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>ID Type</TableHead>
                    <TableHead>Visits</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuests.map(guest => (
                    <TableRow key={guest.id}>
                      <TableCell className="font-medium">{guest.full_name}</TableCell>
                      <TableCell>{guest.phone}</TableCell>
                      <TableCell>{guest.email || '-'}</TableCell>
                      <TableCell>{guest.city || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{guest.id_type || 'N/A'}</Badge></TableCell>
                      <TableCell><Badge variant={guest.total_visits > 1 ? 'default' : 'secondary'}>{guest.total_visits}</Badge></TableCell>
                      <TableCell>{format(new Date(guest.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedGuest(guest); setIsViewOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Guest Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Guest Details</DialogTitle>
            </DialogHeader>
            {selectedGuest && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{selectedGuest.full_name.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedGuest.full_name}</h3>
                    <Badge variant={selectedGuest.total_visits > 1 ? 'default' : 'secondary'}>{selectedGuest.total_visits} visits</Badge>
                  </div>
                </div>
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedGuest.phone}</span>
                  </div>
                  {selectedGuest.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedGuest.email}</span>
                    </div>
                  )}
                  {(selectedGuest.address || selectedGuest.city) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        {selectedGuest.address && <p>{selectedGuest.address}</p>}
                        <p>{[selectedGuest.city, selectedGuest.state, selectedGuest.pincode].filter(Boolean).join(', ')}</p>
                      </div>
                    </div>
                  )}
                </div>
                {selectedGuest.id_type && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">ID Proof</p>
                    <p className="font-medium capitalize">{selectedGuest.id_type}: {selectedGuest.id_number || 'N/A'}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}