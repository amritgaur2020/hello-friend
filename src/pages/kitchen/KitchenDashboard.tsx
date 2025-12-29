import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useKitchenInventory, useKitchenOrders, useKitchenMenu, useKitchenMutations } from '@/hooks/useDepartmentData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { useActivityLog } from '@/hooks/useActivityLog';
import { ChefHat, DollarSign, Clock, AlertTriangle, Plus, Package, ClipboardList, BarChart3, Printer, FileText, Trash2, CreditCard, MoreHorizontal, TrendingUp, UtensilsCrossed, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { useMemo, useState, useRef } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TableLayoutVisualization } from '@/components/shared/TableLayoutVisualization';
import { OrderCancellationDialog } from '@/components/shared/OrderCancellationDialog';
import { DepartmentOrder, DepartmentOrderItem, RecipeIngredient } from '@/types/department';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

export default function KitchenDashboard() {
  useOrderNotifications('kitchen', { enabled: true, soundEnabled: true });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  
  const { data: inventory = [] } = useKitchenInventory();
  const { data: orders = [] } = useKitchenOrders('all');
  const { data: menuItems = [] } = useKitchenMenu();
  const { settings } = useHotelSettings();
  const { deleteOrder, updateOrderStatus } = useKitchenMutations();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [selectedOrder, setSelectedOrder] = useState<DepartmentOrder | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash');

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.created_at.startsWith(today));
    const activeOrders = todayOrders.filter(o => ['new', 'preparing', 'served'].includes(o.status));
    const pendingBills = todayOrders.filter(o => o.status === 'served' && o.payment_status === 'pending');
    const todayRevenue = todayOrders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_amount), 0);
    const lowStockItems = inventory.filter(i => i.current_stock <= i.min_stock_level);
    const completedOrders = todayOrders.filter(o => o.status === 'billed');
    const avgOrderValue = completedOrders.length > 0 
      ? completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0) / completedOrders.length 
      : 0;

    return { 
      activeOrders: activeOrders.length, 
      todayRevenue, 
      pendingBills: pendingBills.length, 
      lowStockItems: lowStockItems.length,
      totalOrders: todayOrders.length,
      completedOrders: completedOrders.length,
      avgOrderValue
    };
  }, [orders, inventory]);

  const criticalLowStock = useMemo(() => {
    const usedInRecipes = new Set<string>();
    menuItems.forEach(item => {
      const ingredients = item.ingredients as RecipeIngredient[] | null;
      if (ingredients && Array.isArray(ingredients)) {
        ingredients.forEach(ing => usedInRecipes.add(ing.inventory_id));
      }
    });
    
    return inventory
      .filter(i => usedInRecipes.has(i.id) && i.current_stock <= i.min_stock_level)
      .slice(0, 6);
  }, [inventory, menuItems]);

  const ordersByStatus = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.created_at.startsWith(today));
    return {
      new: todayOrders.filter(o => o.status === 'new').length,
      preparing: todayOrders.filter(o => o.status === 'preparing').length,
      served: todayOrders.filter(o => o.status === 'served').length,
      billed: todayOrders.filter(o => o.status === 'billed').length,
    };
  }, [orders]);

  const recentOrders = orders.slice(0, 8);

  const handlePaymentClick = async (order: DepartmentOrder) => {
    setSelectedOrder(order);
    setPaymentMode('cash');
    setShowPaymentDialog(true);
  };

  const handleDeleteClick = (order: DepartmentOrder) => {
    setSelectedOrder(order);
    setShowDeleteDialog(true);
  };

  const handleCollectPayment = async () => {
    if (!selectedOrder) return;
    
    const { error } = await supabase
      .from('kitchen_orders')
      .update({ 
        payment_status: 'paid', 
        payment_mode: paymentMode,
        status: 'billed'
      })
      .eq('id', selectedOrder.id);

    if (error) {
      toast({ title: 'Failed to update payment', variant: 'destructive' });
    } else {
      toast({ title: 'Payment collected successfully' });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      
      // Log activity for payment collection
      logActivity({
        actionType: 'update',
        module: 'kitchen',
        description: `collected payment for order ${selectedOrder.order_number} via ${paymentMode}`,
        recordType: 'order',
        recordId: selectedOrder.id,
      });
    }
    setShowPaymentDialog(false);
    setSelectedOrder(null);
  };

  const handleConfirmDelete = async (reason: string) => {
    if (!selectedOrder) return;
    await deleteOrder.mutateAsync({ id: selectedOrder.id, reason });
    setShowDeleteDialog(false);
    setSelectedOrder(null);
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    await updateOrderStatus.mutateAsync({ id: orderId, status });
  };

  const totalOrdersForProgress = ordersByStatus.new + ordersByStatus.preparing + ordersByStatus.served + ordersByStatus.billed;

  return (
    <DashboardLayout title="Kitchen Dashboard" subtitle="Real-time overview of kitchen operations">
      {/* Quick Actions Bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Link to="/kitchen/orders">
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </Link>
        <Link to="/kitchen/menu">
          <Button variant="outline" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Menu
          </Button>
        </Link>
        <Link to="/kitchen/inventory">
          <Button variant="outline" className="gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </Button>
        </Link>
        <Link to="/kitchen/reports">
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
          value={`${currencySymbol}${stats.todayRevenue.toLocaleString()}`} 
          icon={DollarSign} 
          iconClassName="text-emerald-500"
        />
        <StatCard 
          label="Active Orders" 
          value={stats.activeOrders} 
          icon={ChefHat} 
          iconClassName="text-orange-500" 
        />
        <StatCard 
          label="Pending Bills" 
          value={stats.pendingBills} 
          icon={Receipt} 
          iconClassName="text-amber-500" 
        />
        <StatCard 
          label="Avg Order Value" 
          value={`${currencySymbol}${stats.avgOrderValue.toFixed(0)}`} 
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
            <Link to="/kitchen/orders">
              <Button variant="outline" size="sm">View All Orders</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ChefHat className="h-12 w-12 text-muted-foreground/50 mb-3" />
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
                  {recentOrders.map((order) => (
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
                        <StatusBadge status={order.status} variant="order" />
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
                            {order.payment_status === 'pending' && (
                              <DropdownMenuItem onClick={() => handlePaymentClick(order)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Collect Payment
                              </DropdownMenuItem>
                            )}
                            {order.status === 'new' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'preparing')}>
                                <ChefHat className="h-4 w-4 mr-2" />
                                Start Preparing
                              </DropdownMenuItem>
                            )}
                            {order.status === 'preparing' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'served')}>
                                <UtensilsCrossed className="h-4 w-4 mr-2" />
                                Mark Served
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(order)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Order
                            </DropdownMenuItem>
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
          {criticalLowStock.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Low Stock Alert
                </CardTitle>
                <CardDescription>Recipe ingredients running low</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {criticalLowStock.map(item => (
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
                <Link to="/kitchen/inventory" className="block mt-3">
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
                  <div className="text-2xl font-bold text-primary">{stats.totalOrders}</div>
                  <div className="text-xs text-muted-foreground">Total Orders</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{stats.completedOrders}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg col-span-2">
                  <div className="text-2xl font-bold">{currencySymbol}{stats.todayRevenue.toLocaleString()}</div>
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
          orders={orders.map(o => ({
            id: o.id,
            table_number: o.table_number,
            status: o.status,
            order_number: o.order_number,
            total_amount: o.total_amount,
            payment_status: o.payment_status
          }))}
          totalTables={12}
          currencySymbol={currencySymbol}
          onNewOrder={(tableNumber) => {
            window.location.href = `/kitchen/orders?table=${tableNumber}`;
          }}
          onCollectPayment={(order, paymentModeValue) => {
            const fullOrder = orders.find(o => o.id === order.id);
            if (fullOrder) {
              setSelectedOrder(fullOrder);
              setPaymentMode(paymentModeValue);
              handleCollectPayment();
            }
          }}
        />
      </div>

      {/* Payment Collection Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
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
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handleCollectPayment}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <OrderCancellationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        orderNumber={selectedOrder?.order_number || ''}
        onConfirm={handleConfirmDelete}
        isLoading={deleteOrder.isPending}
      />
    </DashboardLayout>
  );
}
