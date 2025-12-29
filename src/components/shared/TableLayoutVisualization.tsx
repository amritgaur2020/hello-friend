import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, Plus, Printer, CreditCard, Receipt, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableOrder {
  id: string;
  table_number: string | null;
  status: string;
  order_number: string;
  total_amount: number;
  payment_status: string;
}

interface TableLayoutProps {
  orders: TableOrder[];
  totalTables?: number;
  currencySymbol?: string;
  onTableClick?: (tableNumber: string, status: 'available' | 'occupied' | 'billing', order?: TableOrder) => void;
  onNewOrder?: (tableNumber: string) => void;
  onPrintKOT?: (order: TableOrder) => void;
  onPrintBill?: (order: TableOrder) => void;
  onCollectPayment?: (order: TableOrder, paymentMode: string) => void;
}

export function TableLayoutVisualization({ 
  orders, 
  totalTables = 12,
  currencySymbol = '₹',
  onTableClick,
  onNewOrder,
  onPrintKOT,
  onPrintBill,
  onCollectPayment,
}: TableLayoutProps) {
  const [selectedTable, setSelectedTable] = useState<{
    tableNumber: string;
    status: 'available' | 'occupied' | 'billing';
    order?: TableOrder;
  } | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash');

  const tableStatus = useMemo(() => {
    const statusMap: Record<string, {
      status: 'occupied' | 'available' | 'billing' | 'cancelled';
      order?: TableOrder;
    }> = {};

    // Initialize all tables as available
    for (let i = 1; i <= totalTables; i++) {
      statusMap[i.toString()] = { status: 'available' };
    }

    // Mark occupied tables based on active orders (exclude cancelled)
    orders.forEach(order => {
      if (order.table_number && ['new', 'preparing', 'served'].includes(order.status)) {
        statusMap[order.table_number] = {
          status: order.status === 'served' && order.payment_status === 'pending' ? 'billing' : 'occupied',
          order,
        };
      }
    });

    return statusMap;
  }, [orders, totalTables]);

  const stats = useMemo(() => {
    const values = Object.values(tableStatus);
    return {
      available: values.filter(t => t.status === 'available').length,
      occupied: values.filter(t => t.status === 'occupied').length,
      billing: values.filter(t => t.status === 'billing').length,
    };
  }, [tableStatus]);

  const handleTableClick = (tableNum: string) => {
    const table = tableStatus[tableNum];
    if (table.status === 'available' || table.status === 'occupied' || table.status === 'billing') {
      setSelectedTable({
        tableNumber: tableNum,
        status: table.status,
        order: table.order,
      });
      onTableClick?.(tableNum, table.status, table.order);
    }
  };

  const handleNewOrder = () => {
    if (selectedTable) {
      onNewOrder?.(selectedTable.tableNumber);
      setSelectedTable(null);
    }
  };

  const handlePrintKOT = () => {
    if (selectedTable?.order) {
      onPrintKOT?.(selectedTable.order);
      setSelectedTable(null);
    }
  };

  const handlePrintBill = () => {
    if (selectedTable?.order) {
      onPrintBill?.(selectedTable.order);
      setSelectedTable(null);
    }
  };

  const handleCollectPayment = () => {
    if (selectedTable?.order) {
      onCollectPayment?.(selectedTable.order, paymentMode);
      setShowPaymentDialog(false);
      setSelectedTable(null);
    }
  };

  const openPaymentDialog = () => {
    setPaymentMode('cash');
    setShowPaymentDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Table Status
              </CardTitle>
              <CardDescription>Click on a table to manage orders</CardDescription>
            </div>
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium">{stats.available} Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="font-medium">{stats.occupied} Occupied</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="font-medium">{stats.billing} Billing</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {Array.from({ length: totalTables }, (_, i) => {
              const tableNum = (i + 1).toString();
              const table = tableStatus[tableNum];
              const isSelected = selectedTable?.tableNumber === tableNum;
              
              return (
                <button
                  key={tableNum}
                  onClick={() => handleTableClick(tableNum)}
                  className={cn(
                    "relative p-3 rounded-xl border-2 transition-all cursor-pointer",
                    "flex flex-col items-center justify-center min-h-[80px]",
                    "hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2",
                    table.status === 'available' && "bg-emerald-50 border-emerald-300 hover:border-emerald-400 focus:ring-emerald-500 dark:bg-emerald-950/30 dark:border-emerald-700",
                    table.status === 'occupied' && "bg-blue-50 border-blue-300 hover:border-blue-400 focus:ring-blue-500 dark:bg-blue-950/30 dark:border-blue-700",
                    table.status === 'billing' && "bg-amber-50 border-amber-300 hover:border-amber-400 focus:ring-amber-500 dark:bg-amber-950/30 dark:border-amber-700 animate-pulse",
                    isSelected && "ring-2 ring-offset-2 scale-105 shadow-lg"
                  )}
                >
                  <span className={cn(
                    "text-xl font-bold",
                    table.status === 'available' && "text-emerald-700 dark:text-emerald-400",
                    table.status === 'occupied' && "text-blue-700 dark:text-blue-400",
                    table.status === 'billing' && "text-amber-700 dark:text-amber-400"
                  )}>
                    T{tableNum}
                  </span>
                  {table.order && (
                    <>
                      <span className="text-[10px] text-muted-foreground font-medium truncate max-w-full">
                        {table.order.order_number}
                      </span>
                      <span className={cn(
                        "text-sm font-bold",
                        table.status === 'occupied' && "text-blue-600 dark:text-blue-400",
                        table.status === 'billing' && "text-amber-600 dark:text-amber-400"
                      )}>
                        {currencySymbol}{table.order.total_amount?.toFixed(0)}
                      </span>
                    </>
                  )}
                  {table.status === 'available' && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Available
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-emerald-500" />
              <span>Available - Click to create order</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-blue-500" />
              <span>Occupied - Click to print KOT/Bill</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-amber-500" />
              <span>Ready to Bill - Click to collect payment</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Action Dialog */}
      <Dialog open={!!selectedTable && !showPaymentDialog} onOpenChange={(open) => !open && setSelectedTable(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-lg px-3 py-1",
                  selectedTable?.status === 'available' && "bg-emerald-100 text-emerald-700 border-emerald-300",
                  selectedTable?.status === 'occupied' && "bg-blue-100 text-blue-700 border-blue-300",
                  selectedTable?.status === 'billing' && "bg-amber-100 text-amber-700 border-amber-300",
                )}
              >
                Table {selectedTable?.tableNumber}
              </Badge>
              {selectedTable?.order && (
                <span className="text-sm font-normal text-muted-foreground">
                  {selectedTable.order.order_number}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTable?.status === 'available' && "This table is available. Create a new order?"}
              {selectedTable?.status === 'occupied' && `Order total: ${currencySymbol}${selectedTable.order?.total_amount?.toFixed(2)}`}
              {selectedTable?.status === 'billing' && `Ready for payment: ${currencySymbol}${selectedTable.order?.total_amount?.toFixed(2)}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-4">
            {selectedTable?.status === 'available' && onNewOrder && (
              <Button onClick={handleNewOrder} className="gap-2" size="lg">
                <Plus className="h-5 w-5" />
                Create New Order
              </Button>
            )}
            
            {selectedTable?.status === 'occupied' && (
              <>
                {onPrintKOT && (
                  <Button onClick={handlePrintKOT} variant="outline" className="gap-2" size="lg">
                    <Printer className="h-5 w-5" />
                    Print KOT
                  </Button>
                )}
                {onPrintBill && (
                  <Button onClick={handlePrintBill} variant="outline" className="gap-2" size="lg">
                    <Receipt className="h-5 w-5" />
                    Print Bill
                  </Button>
                )}
              </>
            )}
            
            {selectedTable?.status === 'billing' && (
              <>
                {onPrintBill && (
                  <Button onClick={handlePrintBill} variant="outline" className="gap-2" size="lg">
                    <Receipt className="h-5 w-5" />
                    Print Bill
                  </Button>
                )}
                {onCollectPayment && (
                  <Button onClick={openPaymentDialog} className="gap-2" size="lg">
                    <CreditCard className="h-5 w-5" />
                    Collect Payment
                  </Button>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedTable(null)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>
              Table {selectedTable?.tableNumber} - {selectedTable?.order?.order_number}
              <br />
              Amount: {currencySymbol}{selectedTable?.order?.total_amount?.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="room_charge">Room Charge</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCollectPayment} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}