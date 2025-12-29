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
import { useKitchenMenu, useKitchenMutations } from '@/hooks/useDepartmentData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { Plus, Edit } from 'lucide-react';

const MENU_CATEGORIES = [
  { value: 'starters', label: 'Starters' },
  { value: 'soups', label: 'Soups' },
  { value: 'salads', label: 'Salads' },
  { value: 'main_course', label: 'Main Course' },
  { value: 'rice', label: 'Rice & Biryani' },
  { value: 'breads', label: 'Breads' },
  { value: 'desserts', label: 'Desserts' },
  { value: 'beverages', label: 'Beverages' },
];

export default function KitchenMenu() {
  const { data: menuItems = [], isLoading } = useKitchenMenu();
  const { addMenuItem, updateMenuItem } = useKitchenMutations();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', category: 'main_course', price: 0, description: '', is_available: true
  });

  const handleSave = async () => {
    if (editingItem) {
      await updateMenuItem.mutateAsync({ id: editingItem.id, ...formData });
    } else {
      await addMenuItem.mutateAsync(formData);
    }
    setShowDialog(false);
    setEditingItem(null);
    setFormData({ name: '', category: 'main_course', price: 0, description: '', is_available: true });
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description || '',
      is_available: item.is_available,
    });
    setShowDialog(true);
  };

  return (
    <DashboardLayout title="Kitchen Menu" subtitle="Manage food menu items">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Menu Items ({menuItems.length})</h3>
          <Button onClick={() => { setEditingItem(null); setFormData({ name: '', category: 'main_course', price: 0, description: '', is_available: true }); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />Add Item
          </Button>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="capitalize">{item.category.replace('_', ' ')}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{item.price}</TableCell>
                    <TableCell>
                      <Switch 
                        checked={item.is_available} 
                        onCheckedChange={(checked) => updateMenuItem.mutate({ id: item.id, is_available: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle></DialogHeader>
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
                    {MENU_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
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
