import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useHotelSettings } from '@/hooks/useHotelSettings';

interface SpaService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  duration_minutes: number | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export default function Services() {
  const queryClient = useQueryClient();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<SpaService | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    duration_minutes: '60',
    is_available: true,
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['spa-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spa_services')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as SpaService[];
    },
  });

  const categories = [...new Set(services.filter(s => s.category).map(s => s.category))];

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('spa_services').insert([{
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price) || 0,
        category: data.category || null,
        duration_minutes: parseInt(data.duration_minutes) || 60,
        is_available: data.is_available,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spa-services'] });
      toast.success('Service created successfully');
      handleCloseDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('spa_services')
        .update({
          name: data.name,
          description: data.description || null,
          price: parseFloat(data.price) || 0,
          category: data.category || null,
          duration_minutes: parseInt(data.duration_minutes) || 60,
          is_available: data.is_available,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spa-services'] });
      toast.success('Service updated successfully');
      handleCloseDialog();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('spa_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spa-services'] });
      toast.success('Service deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleOpenDialog = (service?: SpaService) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || '',
        price: service.price.toString(),
        category: service.category || '',
        duration_minutes: (service.duration_minutes || 60).toString(),
        is_available: service.is_available,
      });
    } else {
      setEditingService(null);
      setFormData({ name: '', description: '', price: '', category: '', duration_minutes: '60', is_available: true });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingService(null);
    setFormData({ name: '', description: '', price: '', category: '', duration_minutes: '60', is_available: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Service name is required');
      return;
    }
    if (!formData.price || parseFloat(formData.price) < 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || service.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && service.is_available) ||
      (filterStatus === 'inactive' && !service.is_available);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <DashboardLayout title="Services" subtitle="Manage spa services">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search services..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat || ''}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => handleOpenDialog()}><Plus className="h-4 w-4 mr-2" />Add Service</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map(service => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        {service.description && <p className="text-sm text-muted-foreground truncate max-w-xs">{service.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{service.category || '-'}</TableCell>
                    <TableCell>{service.duration_minutes ? `${service.duration_minutes} mins` : '-'}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{service.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={service.is_available ? 'default' : 'secondary'}>
                        {service.is_available ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(service)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(service.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredServices.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No services found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
            <DialogDescription>{editingService ? 'Update service details' : 'Create a new spa service'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g., Massage, Facial" /></div>
              <div className="space-y-2"><Label>Duration (mins)</Label><Input type="number" value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Price ({currencySymbol}) *</Label><Input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} /></div>
            <div className="flex items-center space-x-2"><Switch checked={formData.is_available} onCheckedChange={checked => setFormData({...formData, is_available: checked})} /><Label>Available</Label></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editingService ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
