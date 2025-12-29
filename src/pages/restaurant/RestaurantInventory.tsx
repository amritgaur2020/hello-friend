import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useRestaurantInventory, useRestaurantMutations } from '@/hooks/useDepartmentData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { useAuth } from '@/hooks/useAuth';
import { StockAlertBadge } from '@/components/bar/StockAlertBadge';
import { InventoryExcelImport } from '@/components/shared/InventoryExcelImport';
import { InventoryEditDialog } from '@/components/shared/InventoryEditDialog';
import { InventoryDeleteDialog } from '@/components/shared/InventoryDeleteDialog';
import { StockAdjustmentDialog } from '@/components/shared/StockAdjustmentDialog';
import { RESTAURANT_UNITS } from '@/constants/inventoryUnits';
import { Plus, Package, Edit, Trash2, TrendingUp } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'meat', label: 'Meat' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'grains', label: 'Grains' },
  { value: 'spices', label: 'Spices' },
  { value: 'other', label: 'Other' },
];

export default function RestaurantInventory() {
  const { data: inventory = [] } = useRestaurantInventory();
  const { addInventory, updateInventory, deleteInventory, bulkAddInventory, addTransaction } = useRestaurantMutations();
  const { settings } = useHotelSettings();
  const { isAdmin, hasPermission } = useAuth();
  const currencySymbol = settings?.currency_symbol || '₹';
  
  const canEdit = isAdmin || hasPermission('restaurant', 'edit');
  const canDelete = isAdmin || hasPermission('restaurant', 'delete');
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [stockItem, setStockItem] = useState<any>(null);
  const [customCategories, setCustomCategories] = useState<{ value: string; label: string }[]>([]);
  
  const categories = [...DEFAULT_CATEGORIES, ...customCategories];
  
  const handleAddCategory = (categoryValue: string) => {
    const newCategory = { value: categoryValue, label: categoryValue.charAt(0).toUpperCase() + categoryValue.slice(1) };
    if (!categories.some(c => c.value === categoryValue)) {
      setCustomCategories(prev => [...prev, newCategory]);
    }
  };
  
  const [newItem, setNewItem] = useState({ name: '', category: 'vegetables', unit: 'kg', current_stock: 0, min_stock_level: 5, cost_price: 0, selling_price: 0 });

  const handleAddItem = async () => {
    await addInventory.mutateAsync(newItem);
    setShowAddDialog(false);
    setNewItem({ name: '', category: 'vegetables', unit: 'kg', current_stock: 0, min_stock_level: 5, cost_price: 0, selling_price: 0 });
  };

  const handleBulkImport = (items: any[]) => {
    bulkAddInventory.mutate(items);
  };

  const handleEditSave = async (data: any) => {
    await updateInventory.mutateAsync(data);
    setEditItem(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteItem) {
      await deleteInventory.mutateAsync(deleteItem.id);
      setDeleteItem(null);
    }
  };

  const handleStockAdjust = async (data: { itemId: string; type: 'add' | 'remove'; quantity: number; transactionType: string; notes: string }) => {
    await addTransaction.mutateAsync({
      inventory_id: data.itemId,
      transaction_type: data.transactionType,
      quantity: data.quantity,
      notes: data.notes,
    });
    setStockItem(null);
  };

  const lowStockItems = inventory.filter(i => i.current_stock <= i.min_stock_level);

  return (
    <DashboardLayout title="Restaurant Inventory" subtitle="Manage stock and supplies">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">All Items ({inventory.length})</h3>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Item
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                    {(canEdit || canDelete) && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="capitalize">{item.category}</TableCell>
                      <TableCell className="text-right">{Number(item.current_stock).toFixed(2)} {item.unit}</TableCell>
                      <TableCell className="text-right">{currencySymbol}{Number(item.cost_price).toFixed(2)}</TableCell>
                      <TableCell>
                        <StockAlertBadge currentStock={item.current_stock} minStockLevel={item.min_stock_level} />
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canEdit && (
                              <>
                                <Button size="icon" variant="ghost" onClick={() => setStockItem(item)}>
                                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setEditItem(item)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {canDelete && (
                              <Button size="icon" variant="ghost" onClick={() => setDeleteItem(item)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <InventoryExcelImport
            departmentName="Restaurant"
            categories={categories}
            units={RESTAURANT_UNITS}
            onImport={handleBulkImport}
            isLoading={bulkAddInventory.isPending}
            hasSellingPrice
            onAddCategory={handleAddCategory}
          />
          
          {lowStockItems.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-400 flex items-center gap-2">
                  <Package className="h-4 w-4" />Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowStockItems.slice(0, 5).map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="text-amber-400">{Number(item.current_stock).toFixed(2)} left</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newItem.category} onValueChange={v => setNewItem({ ...newItem, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={newItem.unit} onValueChange={v => setNewItem({ ...newItem, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RESTAURANT_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input type="number" value={newItem.current_stock} onChange={e => setNewItem({ ...newItem, current_stock: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Min Level</Label>
                <Input type="number" value={newItem.min_stock_level} onChange={e => setNewItem({ ...newItem, min_stock_level: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost Price</Label>
                <Input type="number" value={newItem.cost_price} onChange={e => setNewItem({ ...newItem, cost_price: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Selling Price</Label>
                <Input type="number" value={newItem.selling_price} onChange={e => setNewItem({ ...newItem, selling_price: parseFloat(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={!newItem.name || addInventory.isPending}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <InventoryEditDialog
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
        item={editItem}
        categories={categories}
        units={RESTAURANT_UNITS}
        onSave={handleEditSave}
        isLoading={updateInventory.isPending}
        hasSellingPrice
      />

      {/* Delete Dialog */}
      <InventoryDeleteDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        itemName={deleteItem?.name || ''}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteInventory.isPending}
      />

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={!!stockItem}
        onOpenChange={(open) => !open && setStockItem(null)}
        item={stockItem}
        onAdjust={handleStockAdjust}
        isLoading={addTransaction.isPending}
      />
    </DashboardLayout>
  );
}
