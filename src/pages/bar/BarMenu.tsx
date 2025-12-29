import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useBarMenu, useBarMenuMutations } from '@/hooks/useBarData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { useModuleAccess } from '@/hooks/usePermissions';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { BAR_CATEGORIES } from '@/types/bar';
import { Plus, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function BarMenu() {
  const { data: menuItems = [] } = useBarMenu();
  const { addMenuItem, updateMenuItem, toggleAvailability } = useBarMenuMutations();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  
  // Permission checks
  const { canView, canCreate, canEdit, loading, isAdmin } = useModuleAccess('bar');
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', category: 'cocktails', price: 0, description: '' });

  const handleSave = async () => {
    if (editingItem) {
      if (!canEdit && !isAdmin) {
        toast.error('You don\'t have permission to edit menu items');
        return;
      }
      await updateMenuItem.mutateAsync({ id: editingItem.id, ...formData });
    } else {
      if (!canCreate && !isAdmin) {
        toast.error('You don\'t have permission to create menu items');
        return;
      }
      await addMenuItem.mutateAsync(formData as any);
    }
    setShowDialog(false);
    setEditingItem(null);
    setFormData({ name: '', category: 'cocktails', price: 0, description: '' });
  };

  const openEdit = (item: any) => {
    if (!canEdit && !isAdmin) {
      toast.error('You don\'t have permission to edit menu items');
      return;
    }
    setEditingItem(item);
    setFormData({ name: item.name, category: item.category, price: item.price, description: item.description || '' });
    setShowDialog(true);
  };

  const handleToggleAvailability = (id: string, is_available: boolean) => {
    if (!canEdit && !isAdmin) {
      toast.error('You don\'t have permission to edit menu items');
      return;
    }
    toggleAvailability.mutate({ id, is_available });
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout title="Bar Menu" subtitle="Manage drinks and pricing">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Permission check
  if (!canView && !isAdmin) {
    return (
      <DashboardLayout title="Bar Menu" subtitle="Manage drinks and pricing">
        <AccessDenied 
          title="Access Denied" 
          message="You don't have permission to view the Bar Menu. Please contact your administrator."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Bar Menu" subtitle="Manage drinks and pricing">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold">Menu Items ({menuItems.length})</h3>
        {(canCreate || isAdmin) && (
          <Button onClick={() => { setEditingItem(null); setFormData({ name: '', category: 'cocktails', price: 0, description: '' }); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />Add Item
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Available</TableHead>
                {(canEdit || isAdmin) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{item.category.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{currencySymbol}{item.price}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={item.is_available} 
                      onCheckedChange={(v) => handleToggleAvailability(item.id, v)} 
                      disabled={!canEdit && !isAdmin}
                    />
                  </TableCell>
                  {(canEdit || isAdmin) && (
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Edit' : 'Add'} Menu Item</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BAR_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.name}>{editingItem ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
