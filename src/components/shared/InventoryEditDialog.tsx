import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  cost_price: number;
  selling_price?: number;
  supplier?: string | null;
  sku?: string | null;
}

interface InventoryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  categories: { value: string; label: string }[];
  units: { value: string; label: string }[];
  onSave: (data: Partial<InventoryItem> & { id: string }) => void;
  isLoading?: boolean;
  hasSellingPrice?: boolean;
  hasSupplier?: boolean;
  hasSku?: boolean;
}

export function InventoryEditDialog({
  open,
  onOpenChange,
  item,
  categories,
  units,
  onSave,
  isLoading,
  hasSellingPrice = false,
  hasSupplier = false,
  hasSku = false,
}: InventoryEditDialogProps) {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category,
        unit: item.unit,
        current_stock: item.current_stock,
        min_stock_level: item.min_stock_level,
        cost_price: item.cost_price,
        selling_price: item.selling_price || 0,
        supplier: item.supplier || '',
        sku: item.sku || '',
      });
    }
  }, [item]);

  const handleSave = () => {
    if (!item) return;
    // Round all numeric values to 2 decimal places
    onSave({ 
      ...formData, 
      id: item.id,
      current_stock: formData.current_stock ? Number(formData.current_stock.toFixed(2)) : 0,
      min_stock_level: formData.min_stock_level ? Number(formData.min_stock_level.toFixed(2)) : 0,
      cost_price: formData.cost_price ? Number(formData.cost_price.toFixed(2)) : 0,
      selling_price: formData.selling_price ? Number(formData.selling_price.toFixed(2)) : 0,
    });
  };

  // Validate and parse number with max 2 decimal places
  const handleNumberChange = (field: keyof InventoryItem, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setFormData({ ...formData, [field]: Math.round(num * 100) / 100 });
    } else if (value === '') {
      setFormData({ ...formData, [field]: 0 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category || ''}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={formData.unit || ''}
                onValueChange={(v) => setFormData({ ...formData, unit: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current Stock</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.current_stock ?? 0}
                onChange={(e) => handleNumberChange('current_stock', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Min Level</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.min_stock_level ?? 0}
                onChange={(e) => handleNumberChange('min_stock_level', e.target.value)}
              />
            </div>
          </div>

          <div className={`grid gap-4 ${hasSellingPrice ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="space-y-2">
              <Label>Cost Price</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_price ?? 0}
                onChange={(e) => handleNumberChange('cost_price', e.target.value)}
              />
            </div>
            {hasSellingPrice && (
              <div className="space-y-2">
                <Label>Selling Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.selling_price ?? 0}
                  onChange={(e) => handleNumberChange('selling_price', e.target.value)}
                />
              </div>
            )}
          </div>

          {(hasSupplier || hasSku) && (
            <div className="grid grid-cols-2 gap-4">
              {hasSupplier && (
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Input
                    value={formData.supplier || ''}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  />
                </div>
              )}
              {hasSku && (
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.name || isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
