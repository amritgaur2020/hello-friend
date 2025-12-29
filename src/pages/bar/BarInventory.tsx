import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useBarInventory, useBarInventoryMutations, useInventoryTransactionMutations } from '@/hooks/useBarData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { useModuleAccess } from '@/hooks/usePermissions';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { ExcelImport } from '@/components/bar/ExcelImport';
import { StockAlertBadge } from '@/components/bar/StockAlertBadge';
import { StockHistoryDialog } from '@/components/shared/StockHistoryDialog';
import { INVENTORY_CATEGORIES, INVENTORY_UNITS } from '@/types/bar';
import { Plus, Package, TrendingUp, TrendingDown, History } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function BarInventory() {
  const { data: inventory = [], isLoading } = useBarInventory();
  const { addInventory, bulkAddInventory } = useBarInventoryMutations();
  const { addTransaction } = useInventoryTransactionMutations();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  
  // Permission checks
  const { canView, canCreate, canEdit, loading, isAdmin } = useModuleAccess('bar');
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [stockAction, setStockAction] = useState<'add' | 'remove'>('add');
  const [stockQty, setStockQty] = useState('');
  const [stockNotes, setStockNotes] = useState('');
  
  const [newItem, setNewItem] = useState({
    name: '', category: 'spirits', unit: 'bottle',
    current_stock: 0, min_stock_level: 5, cost_price: 0, selling_price: 0,
    supplier: '', sku: ''
  });

  const handleAddItem = async () => {
    if (!canCreate && !isAdmin) {
      toast.error('You don\'t have permission to create inventory items');
      return;
    }
    await addInventory.mutateAsync(newItem as any);
    setShowAddDialog(false);
    setNewItem({ name: '', category: 'spirits', unit: 'bottle', current_stock: 0, min_stock_level: 5, cost_price: 0, selling_price: 0, supplier: '', sku: '' });
  };

  const handleStockUpdate = async () => {
    if (!canEdit && !isAdmin) {
      toast.error('You don\'t have permission to update stock');
      return;
    }
    await addTransaction.mutateAsync({
      inventory_id: selectedItem.id,
      transaction_type: stockAction === 'add' ? 'purchase' : 'waste',
      quantity: parseFloat(stockQty),
      notes: stockNotes,
    });
    setShowStockDialog(false);
    setStockQty('');
    setStockNotes('');
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout title="Bar Inventory" subtitle="Manage stock and supplies">
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
      <DashboardLayout title="Bar Inventory" subtitle="Manage stock and supplies">
        <AccessDenied 
          title="Access Denied" 
          message="You don't have permission to view the Bar Inventory. Please contact your administrator."
        />
      </DashboardLayout>
    );
  }

  const lowStockItems = inventory.filter(i => i.current_stock <= i.min_stock_level);

  return (
    <DashboardLayout title="Bar Inventory" subtitle="Manage stock and supplies">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main inventory table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">All Items ({inventory.length})</h3>
            {(canCreate || isAdmin) && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />Add Item
              </Button>
            )}
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    {(canEdit || isAdmin) && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="capitalize">{item.category}</TableCell>
                      <TableCell className="text-right">{Number(item.current_stock).toFixed(2)} {item.unit}</TableCell>
                      <TableCell className="text-right">{currencySymbol}{Number(item.selling_price).toFixed(2)}</TableCell>
                      <TableCell>
                        <StockAlertBadge currentStock={item.current_stock} minStockLevel={item.min_stock_level} />
                      </TableCell>
                      {(canEdit || isAdmin) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setSelectedItem(item); setShowHistoryDialog(true); }} title="View History">
                              <History className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => { setSelectedItem(item); setStockAction('add'); setShowStockDialog(true); }}>
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => { setSelectedItem(item); setStockAction('remove'); setShowStockDialog(true); }}>
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            </Button>
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

        {/* Sidebar */}
        <div className="space-y-4">
          {(canCreate || isAdmin) && (
            <ExcelImport onImport={(items) => bulkAddInventory.mutate(items as any)} isLoading={bulkAddInventory.isPending} />
          )}
          
          {lowStockItems.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-500" />
                  Low Stock Alert
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="text-amber-500 font-medium">{Number(item.current_stock).toFixed(2)} left</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVENTORY_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={newItem.unit} onValueChange={(v) => setNewItem({ ...newItem, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVENTORY_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <Input type="number" value={newItem.current_stock} onChange={(e) => setNewItem({ ...newItem, current_stock: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Min Stock Level</Label>
                <Input type="number" value={newItem.min_stock_level} onChange={(e) => setNewItem({ ...newItem, min_stock_level: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost Price</Label>
                <Input type="number" value={newItem.cost_price} onChange={(e) => setNewItem({ ...newItem, cost_price: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Selling Price</Label>
                <Input type="number" value={newItem.selling_price} onChange={(e) => setNewItem({ ...newItem, selling_price: parseFloat(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={!newItem.name}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Update Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{stockAction === 'add' ? 'Add' : 'Remove'} Stock - {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-2xl font-bold">{Number(selectedItem?.current_stock || 0).toFixed(2)} {selectedItem?.unit}</p>
            </div>
            <div className="space-y-2">
              <Label>Quantity to {stockAction === 'add' ? 'Add' : 'Remove'}</Label>
              <Input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} min="1" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={stockNotes} onChange={(e) => setStockNotes(e.target.value)} placeholder="Reason for adjustment" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockDialog(false)}>Cancel</Button>
            <Button onClick={handleStockUpdate} disabled={!stockQty}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock History Dialog */}
      <StockHistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        inventoryId={selectedItem?.id || null}
        inventoryName={selectedItem?.name || ''}
        tableName="bar_inventory_transactions"
      />
    </DashboardLayout>
  );
}
