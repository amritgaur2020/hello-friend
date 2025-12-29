import { useState, useRef, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBarStats, useBarOrders, useBarOrderItems, useBarOrderMutations, useBarMenu, useBarInventory } from '@/hooks/useBarData';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { useModuleAccess } from '@/hooks/usePermissions';
import { useActivityLog } from '@/hooks/useActivityLog';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { OrderStatusBadge } from '@/components/bar/OrderStatusBadge';
import { BillPrint } from '@/components/bar/BillPrint';
import { KOTPrint } from '@/components/bar/KOTPrint';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TableLayoutVisualization } from '@/components/shared/TableLayoutVisualization';
import { OrderCancellationDialog } from '@/components/shared/OrderCancellationDialog';
import { BarOrder, BarOrderItem, BarMenuItem } from '@/types/bar';
import { Wine, DollarSign, Clock, AlertTriangle, Plus, Package, ClipboardList, BarChart3, Printer, FileText, CreditCard, Trash2, MoreHorizontal, TrendingUp, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';

export default function BarDashboard() {
  useOrderNotifications('bar', { enabled: true, soundEnabled: true });
  
  const { logActivity } = useActivityLog();
  const { data: stats } = useBarStats();
  const { data: recentOrders = [] } = useBarOrders('all');
  const { data: menuItems = [] } = useBarMenu();
  const { data: inventory = [] } = useBarInventory();
  const { updatePayment, updateOrder, deleteOrder, addOrderItem, deleteOrderItem } = useBarOrderMutations();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';

  const { canView, canCreate, canEdit, canDelete, loading, isAdmin } = useModuleAccess('bar');

  const [selectedOrder, setSelectedOrder] = useState<BarOrder | null>(null);
  const [showKOT, setShowKOT] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>('cash');

  const kotRef = useRef<HTMLDivElement>(null);
  const billRef = useRef<HTMLDivElement>(null);

  const { data: orderItems = [] } = useBarOrderItems(selectedOrder?.id || '');

  const todayOrders = recentOrders?.slice(0, 8) || [];

  const ordersByStatus = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrdersFiltered = recentOrders.filter(o => o.created_at.startsWith(today));
    return {
      new: todayOrdersFiltered.filter(o => o.status === 'new').length,
      preparing: todayOrdersFiltered.filter(o => o.status === 'preparing').length,
      served: todayOrdersFiltered.filter(o => o.status === 'served').length,
      billed: todayOrdersFiltered.filter(o => o.status === 'billed').length,
    };
  }, [recentOrders]);

  const extendedStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrdersFiltered = recentOrders.filter(o => o.created_at.startsWith(today));
    const completedOrders = todayOrdersFiltered.filter(o => o.status === 'billed');
    const avgOrderValue = completedOrders.length > 0 
      ? completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0) / completedOrders.length 
      : 0;
    const lowStockItems = inventory.filter(i => (i.current_stock || 0) <= (i.min_stock_level || 0));
    
    return {
      totalOrders: todayOrdersFiltered.length,
      completedOrders: completedOrders.length,
      avgOrderValue,
      lowStockItems: lowStockItems.slice(0, 6)
    };
  }, [recentOrders, inventory]);

  const totalOrdersForProgress = ordersByStatus.new + ordersByStatus.preparing + ordersByStatus.served + ordersByStatus.billed;

  if (loading) {
    return (
      <DashboardLayout title="Bar Dashboard" subtitle="Manage orders, inventory, and menu">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!canView && !isAdmin) {
    return (
      <DashboardLayout title="Bar Dashboard" subtitle="Manage orders, inventory, and menu">
        <AccessDenied 
          title="Access Denied" 
          message="You don't have permission to view the Bar module."
        />
      </DashboardLayout>
    );
  }

  const handlePrintKOT = (order: BarOrder) => {
    setSelectedOrder(order);
    setShowKOT(true);
  };

  const handlePrintBill = (order: BarOrder) => {
    setSelectedOrder(order);
    setShowBill(true);
  };

  const handlePayment = (order: BarOrder) => {
    setSelectedOrder(order);
    setShowPayment(true);
  };

  const handleDeleteOrder = (order: BarOrder) => {
    if (!canDelete && !isAdmin) {
      toast.error('You don\'t have permission to delete orders');
      return;
    }
    setSelectedOrder(order);
    setShowDelete(true);
  };

  const confirmPayment = async () => {
    if (selectedOrder) {
      await updatePayment.mutateAsync({
        id: selectedOrder.id,
        payment_status: 'paid',
        payment_mode: paymentMode,
      });
      setShowPayment(false);
      setSelectedOrder(null);
    }
  };

  const confirmDelete = async (reason: string) => {
    if (selectedOrder) {
      await deleteOrder.mutateAsync({ id: selectedOrder.id, reason });
      setShowDelete(false);
      setSelectedOrder(null);
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    await updateOrder.mutateAsync({
      id: orderId,
      order: { status },
      items: []
    });
  };

  const printContent = (ref: React.RefObject<HTMLDivElement>, type: 'kot' | 'bill') => {
    if (ref.current && selectedOrder) {
      const printWindow = window.open('', '', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print</title>
              <style>
                body { margin: 0; padding: 10px; font-family: 'Courier New', monospace; }
                * { box-sizing: border-box; }
              </style>
            </head>
            <body>${ref.current.innerHTML}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        
        // Log the print action
        logActivity({
          actionType: 'view',
          module: 'bar',
          description: `printed ${type === 'kot' ? 'KOT' : 'Bill'} for order ${selectedOrder.order_number}`,
          recordType: 'order',
          recordId: selectedOrder.id,
        });
      }
    }
  };

  return (
    <DashboardLayout title="Bar Dashboard" subtitle="Real-time overview of bar operations">
      {/* Quick Actions Bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {(canCreate || isAdmin) && (
          <Link to="/bar/orders">
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </Link>
        )}
        <Link to="/bar/menu">
          <Button variant="outline" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Menu
          </Button>
        </Link>
        <Link to="/bar/inventory">
          <Button variant="outline" className="gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </Button>
        </Link>
        <Link to="/bar/reports">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          label="Today's Revenue" 
          value={`${currencySymbol}${(stats?.todayRevenue || 0).toLocaleString()}`} 
          icon={DollarSign} 
          iconClassName="text-emerald-500"
        />
        <StatCard 
          label="Active Orders" 
          value={stats?.activeOrders || 0} 
          icon={Wine} 
          iconClassName="text-blue-500" 
        />
        <StatCard 
          label="Pending Bills" 
          value={stats?.pendingBills || 0} 
          icon={Receipt} 
          iconClassName="text-amber-500" 
        />
        <StatCard 
          label="Avg Order Value" 
          value={`${currencySymbol}${extendedStats.avgOrderValue.toFixed(0)}`} 
          icon={TrendingUp} 
          iconClassName="text-purple-500" 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Orders Table */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
            <div>
              <CardTitle className="text-lg font-semibold">Live Orders</CardTitle>
              <CardDescription>Real-time order tracking and management</CardDescription>
            </div>
            <Link to="/bar/orders">
              <Button variant="outline" size="sm">View All Orders</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {todayOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wine className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">No orders yet today</p>
                <p className="text-sm text-muted-foreground">Orders will appear here as they come in</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px]">Order #</TableHead>
                    <TableHead>Table/Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayOrders.map((order) => (
                    <TableRow key={order.id} className="group">
                      <TableCell>
                        <div className="font-medium">{order.order_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.table_number ? (
                          <Badge variant="secondary" className="font-normal">
                            Table {order.table_number}
                          </Badge>
                        ) : (
                          <span className="text-sm capitalize">{order.order_type?.replace('_', ' ')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={order.payment_status === 'paid' ? 'default' : 'outline'}
                          className={order.payment_status === 'pending' ? 'text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30' : ''}
                        >
                          {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {currencySymbol}{order.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handlePrintKOT(order)}>
                              <Printer className="h-4 w-4 mr-2" />
                              Print KOT
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrintBill(order)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Print Bill
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {order.payment_status === 'pending' && (canEdit || isAdmin) && (
                              <DropdownMenuItem onClick={() => handlePayment(order)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Collect Payment
                              </DropdownMenuItem>
                            )}
                            {order.status === 'new' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'preparing')}>
                                <Wine className="h-4 w-4 mr-2" />
                                Start Preparing
                              </DropdownMenuItem>
                            )}
                            {order.status === 'preparing' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'served')}>
                                <Wine className="h-4 w-4 mr-2" />
                                Mark Served
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {(canDelete || isAdmin) && (
                              <DropdownMenuItem 
                                onClick={() => handleDeleteOrder(order)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Order
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right Side Panel */}
        <div className="space-y-6">
          {/* Order Status Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Order Pipeline</CardTitle>
              <CardDescription>Today's order flow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-sm">New</span>
                  </div>
                  <span className="font-semibold">{ordersByStatus.new}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-sm">Preparing</span>
                  </div>
                  <span className="font-semibold">{ordersByStatus.preparing}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm">Served</span>
                  </div>
                  <span className="font-semibold">{ordersByStatus.served}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                    <span className="text-sm">Billed</span>
                  </div>
                  <span className="font-semibold">{ordersByStatus.billed}</span>
                </div>
              </div>
              {totalOrdersForProgress > 0 && (
                <div className="pt-3 border-t">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <span className="font-medium">
                      {((ordersByStatus.billed / totalOrdersForProgress) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={(ordersByStatus.billed / totalOrdersForProgress) * 100} 
                    className="h-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          {extendedStats.lowStockItems.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Low Stock Alert
                </CardTitle>
                <CardDescription>Items running low</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {extendedStats.lowStockItems.map(item => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-2.5 bg-red-50 dark:bg-red-950/20 rounded-lg"
                    >
                      <span className="text-sm font-medium truncate flex-1 mr-2">{item.name}</span>
                      <Badge variant="destructive" className="shrink-0">
                        {item.current_stock} {item.unit}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Link to="/bar/inventory" className="block mt-3">
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Inventory
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Today's Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{extendedStats.totalOrders}</div>
                  <div className="text-xs text-muted-foreground">Total Orders</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{extendedStats.completedOrders}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg col-span-2">
                  <div className="text-2xl font-bold">{currencySymbol}{(stats?.todayRevenue || 0).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Revenue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table Layout Visualization */}
      <div className="mb-6">
        <TableLayoutVisualization 
          orders={recentOrders.map(o => ({
            id: o.id,
            table_number: o.table_number,
            status: o.status,
            order_number: o.order_number || '',
            total_amount: o.total_amount,
            payment_status: o.payment_status
          }))}
          totalTables={10}
          currencySymbol={currencySymbol}
          onNewOrder={(tableNumber) => {
            window.location.href = `/bar/orders?table=${tableNumber}`;
          }}
          onPrintKOT={(order) => {
            const fullOrder = recentOrders.find(o => o.id === order.id);
            if (fullOrder) handlePrintKOT(fullOrder);
          }}
          onPrintBill={(order) => {
            const fullOrder = recentOrders.find(o => o.id === order.id);
            if (fullOrder) handlePrintBill(fullOrder);
          }}
          onCollectPayment={(order, paymentModeValue) => {
            const fullOrder = recentOrders.find(o => o.id === order.id);
            if (fullOrder) {
              setSelectedOrder(fullOrder);
              setPaymentMode(paymentModeValue);
              confirmPayment();
            }
          }}
        />
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>
              Collect payment for order {selectedOrder?.order_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between text-lg font-bold p-4 bg-muted rounded-lg">
              <span>Total Amount:</span>
              <span className="text-primary">{currencySymbol}{selectedOrder?.total_amount.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button onClick={confirmPayment}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <OrderCancellationDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        orderNumber={selectedOrder?.order_number || ''}
        onConfirm={confirmDelete}
        isLoading={deleteOrder.isPending}
      />

      {/* KOT Print Dialog */}
      <Dialog open={showKOT} onOpenChange={setShowKOT}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kitchen Order Ticket</DialogTitle>
          </DialogHeader>
          <div ref={kotRef}>
            {selectedOrder && (
              <KOTPrint order={selectedOrder} items={orderItems} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKOT(false)}>Close</Button>
            <Button onClick={() => printContent(kotRef, 'kot')}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill Print Dialog */}
      <Dialog open={showBill} onOpenChange={setShowBill}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bill</DialogTitle>
          </DialogHeader>
          <div ref={billRef}>
            {selectedOrder && (
              <BillPrint order={selectedOrder} items={orderItems} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBill(false)}>Close</Button>
            <Button onClick={() => printContent(billRef, 'bill')}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
