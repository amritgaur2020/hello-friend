import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: { id: string; name: string; current_stock: number; unit: string } | null;
  onAdjust: (data: { itemId: string; type: 'add' | 'remove'; quantity: number; transactionType: string; notes: string }) => void;
  isLoading?: boolean;
}

const ADD_TRANSACTION_TYPES = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'transfer_in', label: 'Transfer In' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return', label: 'Customer Return' },
];

const REMOVE_TRANSACTION_TYPES = [
  { value: 'usage', label: 'Usage/Consumption' },
  { value: 'waste', label: 'Waste/Spoilage' },
  { value: 'transfer_out', label: 'Transfer Out' },
  { value: 'damage', label: 'Damage' },
];

export function StockAdjustmentDialog({ open, onOpenChange, item, onAdjust, isLoading }: StockAdjustmentDialogProps) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState('');
  const [transactionType, setTransactionType] = useState('purchase');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!item || !quantity) return;
    onAdjust({
      itemId: item.id,
      type: adjustmentType,
      quantity: parseFloat(quantity),
      transactionType,
      notes,
    });
    resetForm();
  };

  const resetForm = () => {
    setQuantity('');
    setNotes('');
    setTransactionType('purchase');
    setAdjustmentType('add');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const transactionTypes = adjustmentType === 'add' ? ADD_TRANSACTION_TYPES : REMOVE_TRANSACTION_TYPES;
  const newStock = item
    ? adjustmentType === 'add'
      ? item.current_stock + (parseFloat(quantity) || 0)
      : item.current_stock - (parseFloat(quantity) || 0)
    : 0;

  // Validate and limit to 2 decimal places
  const handleQuantityChange = (value: string) => {
    // Allow empty or valid number with up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setQuantity(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock - {item?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-muted">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-2xl font-bold">{Number(item?.current_stock || 0).toFixed(2)} {item?.unit}</p>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">New Stock</p>
              <p className={`text-2xl font-bold ${newStock < 0 ? 'text-destructive' : ''}`}>
                {Number(newStock).toFixed(2)} {item?.unit}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={adjustmentType === 'add' ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => {
                setAdjustmentType('add');
                setTransactionType('purchase');
              }}
            >
              <TrendingUp className="h-4 w-4" />
              Add Stock
            </Button>
            <Button
              type="button"
              variant={adjustmentType === 'remove' ? 'destructive' : 'outline'}
              className="gap-2"
              onClick={() => {
                setAdjustmentType('remove');
                setTransactionType('usage');
              }}
            >
              <TrendingDown className="h-4 w-4" />
              Remove Stock
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!quantity || parseFloat(quantity) <= 0 || isLoading || newStock < 0}
          >
            {isLoading ? 'Updating...' : 'Update Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
