import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useSpaServices, useSpaMutations } from '@/hooks/useDepartmentData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { Plus, Edit } from 'lucide-react';

const SERVICE_CATEGORIES = [{ value: 'massage', label: 'Massage' }, { value: 'facial', label: 'Facial' }, { value: 'body', label: 'Body Treatment' }, { value: 'hair', label: 'Hair Care' }, { value: 'nail', label: 'Nail Care' }, { value: 'other', label: 'Other' }];

export default function SpaServices() {
  const { data: services = [] } = useSpaServices();
  const { addService } = useSpaMutations();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: 'massage', price: 0, duration_minutes: 60, description: '', is_available: true });

  const handleSave = async () => {
    await addService.mutateAsync(formData);
    setShowDialog(false);
    setFormData({ name: '', category: 'massage', price: 0, duration_minutes: 60, description: '', is_available: true });
  };

  return (
    <DashboardLayout title="Spa Services" subtitle="Manage spa service offerings">
      <div className="space-y-4">
        <div className="flex justify-between items-center"><h3 className="font-semibold">All Services ({services.length})</h3><Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-2" />Add Service</Button></div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Duration</TableHead><TableHead className="text-right">Price</TableHead><TableHead>Available</TableHead></TableRow></TableHeader>
            <TableBody>{services.map(service => (<TableRow key={service.id}><TableCell className="font-medium">{service.name}</TableCell><TableCell className="capitalize">{service.category}</TableCell><TableCell>{service.duration_minutes} mins</TableCell><TableCell className="text-right">{currencySymbol}{service.price}</TableCell><TableCell><span className={`px-2 py-1 rounded-full text-xs ${service.is_available ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>{service.is_available ? 'Yes' : 'No'}</span></TableCell></TableRow>))}</TableBody>
          </Table>
        </CardContent></Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add Spa Service</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2"><Label>Name</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SERVICE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Duration (mins)</Label><Input type="number" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Price</Label><Input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Description</Label><Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSave} disabled={!formData.name || addService.isPending}>Add Service</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
