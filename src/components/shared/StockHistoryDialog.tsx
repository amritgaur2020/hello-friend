import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Package, History } from 'lucide-react';

interface StockTransaction {
  id: string;
  inventory_id: string;
  transaction_type: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

interface StockHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryId: string | null;
  inventoryName: string;
  tableName: 'bar_inventory_transactions' | 'restaurant_inventory_transactions' | 'housekeeping_inventory_transactions' | 'spa_inventory_transactions' | 'kitchen_inventory_transactions';
}

export function StockHistoryDialog({ 
  open, 
  onOpenChange, 
  inventoryId, 
  inventoryName,
  tableName 
}: StockHistoryDialogProps) {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && inventoryId) {
      fetchTransactions();
    }
  }, [open, inventoryId]);

  const fetchTransactions = async () => {
    if (!inventoryId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('inventory_id', inventoryId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionBadge = (type: string) => {
    const isPositive = ['purchase', 'adjustment_add', 'return'].includes(type);
    return (
      <Badge 
        variant="outline" 
        className={isPositive 
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
          : 'bg-red-500/10 text-red-600 border-red-500/30'
        }
      >
        {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Stock History: {inventoryName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transaction history found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm">
                    {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm')}
                  </TableCell>
                  <TableCell>{getTransactionBadge(tx.transaction_type)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {['sale', 'waste', 'adjustment_remove'].includes(tx.transaction_type) ? '-' : '+'}
                    {tx.quantity}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                    {tx.notes || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
