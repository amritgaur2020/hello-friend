import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, Download, Search, Filter, ChevronLeft, ChevronRight, Eye, 
  ArrowUpDown, Calendar, Clock, DollarSign, ShoppingCart, TrendingUp, Edit2, Trash2, Percent, Plus, Lock, AlertTriangle
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { useTaxSettings } from "@/hooks/useTaxSettings";
import { useModuleAccess } from "@/hooks/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OrderHistoryContentProps {
  orders: any[];
  orderItems?: any[];
  menuItems?: any[];
  currencySymbol: string;
  department: string;
  startDate: Date;
  endDate: Date;
  onUpdateOrder?: (orderId: string, updates: any, items?: any[], newItems?: any[]) => Promise<void>;
}

export function OrderHistoryContent({ 
  orders, 
  orderItems = [],
  menuItems = [],
  currencySymbol, 
  department,
  startDate,
  endDate,
  onUpdateOrder,
}: OrderHistoryContentProps) {
  const { toast } = useToast();
  const { calculateTotalTax, getConsolidatedTaxBreakdown, isLoading: taxLoading } = useTaxSettings();
  const { canEdit, isAdmin } = useModuleAccess(department.toLowerCase());
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [newItems, setNewItems] = useState<any[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPermissionDenied, setShowPermissionDenied] = useState(false);
  const itemsPerPage = 20;

  // Summary stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const completedOrders = orders.filter(o => o.status === "completed").length;
  const paidOrders = orders.filter(o => o.payment_status === "paid").length;

  // Unique filter options
  const uniqueStatuses = [...new Set(orders.map(o => o.status))].filter(Boolean);
  const uniquePaymentStatuses = [...new Set(orders.map(o => o.payment_status))].filter(Boolean);
  const uniqueOrderTypes = [...new Set(orders.map(o => o.order_type))].filter(Boolean);

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.order_number?.toLowerCase().includes(term) ||
        order.table_number?.toLowerCase().includes(term) ||
        order.notes?.toLowerCase().includes(term)
      );
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    if (paymentFilter !== "all") {
      filtered = filtered.filter(order => order.payment_status === paymentFilter);
    }

    if (orderTypeFilter !== "all") {
      filtered = filtered.filter(order => order.order_type === orderTypeFilter);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === "created_at") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (sortField === "total_amount") {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
    
    return filtered;
  }, [orders, searchTerm, statusFilter, paymentFilter, orderTypeFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get order items for selected order
  const selectedOrderItems = useMemo(() => {
    if (!selectedOrder) return [];
    return orderItems.filter(item => item.order_id === selectedOrder.id);
  }, [selectedOrder, orderItems]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed": return "default";
      case "cancelled": return "destructive";
      case "pending": return "secondary";
      case "preparing": return "outline";
      default: return "secondary";
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid": return "default";
      case "pending": return "outline";
      case "refunded": return "destructive";
      default: return "secondary";
    }
  };

  const handleEditOrder = (order: any) => {
    // Check permission before allowing edit
    if (!canEdit && !isAdmin) {
      setShowPermissionDenied(true);
      return;
    }
    
    const items = orderItems.filter(item => item.order_id === order.id);
    setEditingItems(items.map(item => ({
      ...item,
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      total_price: item.total_price || 0,
    })));
    setNewItems([]);
    setShowAddItem(false);
    setEditingOrder({
      ...order,
      order_type: order.order_type || 'dine_in',
      table_number: order.table_number || '',
      status: order.status || 'new',
      payment_status: order.payment_status || 'pending',
      payment_mode: order.payment_mode || 'cash',
      notes: order.notes || '',
      discount_amount: order.discount_amount || 0,
      subtotal: order.subtotal || 0,
      tax_amount: order.tax_amount || 0,
    });
  };

  // Calculate tax based on admin tax settings
  const calculateAutoTax = (subtotal: number): number => {
    // Use department name directly - getTaxesForCategory will normalize it
    const taxAmount = calculateTotalTax([{ category: department, total: subtotal }]);
    return taxAmount;
  };

  // Get tax breakdown for display
  const getTaxBreakdownDisplay = (subtotal: number) => {
    return getConsolidatedTaxBreakdown([{ category: department, total: subtotal }]);
  };

  const recalculateSubtotal = (existingItems: any[], addedItems: any[]) => {
    const existingTotal = existingItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const newTotal = addedItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
    return existingTotal + newTotal;
  };

  // Auto-update tax when subtotal changes
  useEffect(() => {
    if (editingOrder && !taxLoading) {
      const autoTax = calculateAutoTax(editingOrder.subtotal);
      if (autoTax !== editingOrder.tax_amount) {
        setEditingOrder((prev: any) => ({ ...prev, tax_amount: autoTax }));
      }
    }
  }, [editingOrder?.subtotal, taxLoading]);

  const handleItemChange = (index: number, field: string, value: number) => {
    const updatedItems = [...editingItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
      total_price: field === 'quantity' 
        ? value * updatedItems[index].unit_price 
        : field === 'unit_price' 
          ? updatedItems[index].quantity * value 
          : updatedItems[index].total_price,
    };
    setEditingItems(updatedItems);
    
    // Recalculate subtotal
    const newSubtotal = recalculateSubtotal(updatedItems, newItems);
    setEditingOrder((prev: any) => ({ ...prev, subtotal: newSubtotal }));
  };

  const handleRemoveItem = (index: number) => {
    const newItemsList = editingItems.filter((_, i) => i !== index);
    setEditingItems(newItemsList);
    
    // Recalculate subtotal
    const newSubtotal = recalculateSubtotal(newItemsList, newItems);
    setEditingOrder((prev: any) => ({ ...prev, subtotal: newSubtotal }));
  };

  const handleAddMenuItem = (menuItem: any) => {
    const newItem = {
      id: `new_${Date.now()}`,
      isNew: true,
      menu_item_id: menuItem.id,
      item_name: menuItem.name,
      quantity: 1,
      unit_price: menuItem.price || 0,
      total_price: menuItem.price || 0,
    };
    const updatedNewItems = [...newItems, newItem];
    setNewItems(updatedNewItems);
    setShowAddItem(false);
    
    // Recalculate subtotal
    const newSubtotal = recalculateSubtotal(editingItems, updatedNewItems);
    setEditingOrder((prev: any) => ({ ...prev, subtotal: newSubtotal }));
  };

  const handleNewItemChange = (index: number, field: string, value: number) => {
    const updatedNewItems = [...newItems];
    updatedNewItems[index] = {
      ...updatedNewItems[index],
      [field]: value,
      total_price: field === 'quantity' 
        ? value * updatedNewItems[index].unit_price 
        : field === 'unit_price' 
          ? updatedNewItems[index].quantity * value 
          : updatedNewItems[index].total_price,
    };
    setNewItems(updatedNewItems);
    
    // Recalculate subtotal
    const newSubtotal = recalculateSubtotal(editingItems, updatedNewItems);
    setEditingOrder((prev: any) => ({ ...prev, subtotal: newSubtotal }));
  };

  const handleRemoveNewItem = (index: number) => {
    const updatedNewItems = newItems.filter((_, i) => i !== index);
    setNewItems(updatedNewItems);
    
    // Recalculate subtotal
    const newSubtotal = recalculateSubtotal(editingItems, updatedNewItems);
    setEditingOrder((prev: any) => ({ ...prev, subtotal: newSubtotal }));
  };

  const handleSaveEdit = async () => {
    if (!editingOrder || !onUpdateOrder) return;
    
    const calculatedTotal = editingOrder.subtotal + editingOrder.tax_amount - editingOrder.discount_amount;
    
    setIsUpdating(true);
    try {
      await onUpdateOrder(editingOrder.id, {
        order_type: editingOrder.order_type,
        table_number: editingOrder.table_number || null,
        status: editingOrder.status,
        payment_status: editingOrder.payment_status,
        payment_mode: editingOrder.payment_mode,
        notes: editingOrder.notes || null,
        discount_amount: editingOrder.discount_amount,
        subtotal: editingOrder.subtotal,
        tax_amount: editingOrder.tax_amount,
        total_amount: calculatedTotal,
      }, editingItems, newItems.map(item => ({
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })));
      toast({ title: 'Order updated successfully' });
      setEditingOrder(null);
      setEditingItems([]);
      setNewItems([]);
    } catch (error) {
      toast({ title: 'Failed to update order', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${department} Order History`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${format(startDate, "MMM dd, yyyy")} - ${format(endDate, "MMM dd, yyyy")}`, 14, 30);
    doc.text(`Total Orders: ${filteredOrders.length} | Total Revenue: ${currencySymbol}${totalRevenue.toFixed(2)}`, 14, 36);
    
    autoTable(doc, {
      startY: 44,
      head: [["Order #", "Date", "Type", "Table", "Status", "Payment", "Total"]],
      body: filteredOrders.map(order => [
        order.order_number,
        format(parseISO(order.created_at), "MMM dd, HH:mm"),
        order.order_type || "-",
        order.table_number || "-",
        order.status,
        order.payment_status,
        `${currencySymbol}${(order.total_amount || 0).toFixed(2)}`,
      ]),
      styles: { fontSize: 8 },
    });
    
    doc.save(`${department}_Order_History.pdf`);
  };

  const exportExcel = () => {
    const data = filteredOrders.map(order => ({
      "Order Number": order.order_number,
      "Date": format(parseISO(order.created_at), "yyyy-MM-dd HH:mm:ss"),
      "Type": order.order_type || "-",
      "Table": order.table_number || "-",
      "Status": order.status,
      "Payment Status": order.payment_status,
      "Payment Mode": order.payment_mode || "-",
      "Subtotal": order.subtotal || 0,
      "Tax": order.tax_amount || 0,
      "Discount": order.discount_amount || 0,
      "Total": order.total_amount || 0,
      "Notes": order.notes || "",
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Order History");
    XLSX.writeFile(wb, `${department}_Order_History.xlsx`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setOrderTypeFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || paymentFilter !== "all" || orderTypeFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {currencySymbol}{totalRevenue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-purple-600">
                  {completedOrders}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    ({totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(0) : 0}%)
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold text-amber-600">
                  {currencySymbol}{totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search order #, table, notes..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={orderTypeFilter} onValueChange={(v) => { setOrderTypeFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueOrderTypes.map(type => (
                  <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {uniqueStatuses.map(status => (
                  <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                {uniquePaymentStatuses.map(status => (
                  <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={exportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportExcel}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("order_number")}
                  >
                    <div className="flex items-center gap-1">
                      Order # <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center gap-1">
                      Date/Time <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("total_amount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Total <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-16">View</TableHead>
                  {onUpdateOrder && <TableHead className="text-center w-16">Edit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={onUpdateOrder ? 9 : 8} className="text-center text-muted-foreground py-12">
                      No orders found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{format(parseISO(order.created_at), "MMM dd, yyyy")}</span>
                          <span className="text-xs">{format(parseISO(order.created_at), "HH:mm")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{order.order_type || "-"}</Badge>
                      </TableCell>
                      <TableCell>{order.table_number || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.status)} className="capitalize">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPaymentColor(order.payment_status)} className="capitalize">
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {currencySymbol}{(order.total_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      {onUpdateOrder && (
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditOrder(order)}
                            title={!canEdit && !isAdmin ? "You don't have permission to edit orders" : "Edit order"}
                          >
                            {!canEdit && !isAdmin ? (
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Edit2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Order {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date & Time</p>
                  <p className="font-medium">{format(parseISO(selectedOrder.created_at), "MMM dd, yyyy HH:mm")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Order Type</p>
                  <p className="font-medium capitalize">{selectedOrder.order_type || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Table</p>
                  <p className="font-medium">{selectedOrder.table_number || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={getStatusColor(selectedOrder.status)} className="capitalize">
                    {selectedOrder.status}
                  </Badge>
                </div>
              </div>

              {/* Order Items */}
              {selectedOrderItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrderItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{currencySymbol}{(item.unit_price || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{currencySymbol}{(item.total_price || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{currencySymbol}{(selectedOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{currencySymbol}{(selectedOrder.tax_amount || 0).toFixed(2)}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount</span>
                    <span>-{currencySymbol}{selectedOrder.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span className="text-green-600">{currencySymbol}{(selectedOrder.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
              
              {/* Payment Info */}
              <div className="flex justify-between items-center text-sm border-t pt-4">
                <div>
                  <span className="text-muted-foreground mr-2">Payment:</span>
                  <Badge variant={getPaymentColor(selectedOrder.payment_status)} className="capitalize">
                    {selectedOrder.payment_status}
                  </Badge>
                </div>
                {selectedOrder.payment_mode && (
                  <span className="capitalize text-muted-foreground">{selectedOrder.payment_mode}</span>
                )}
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="text-sm border-t pt-4">
                  <p className="text-muted-foreground mb-1">Notes</p>
                  <p className="bg-muted/50 rounded p-2">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={() => { setEditingOrder(null); setEditingItems([]); setNewItems([]); }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Edit Order {editingOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          {editingOrder && (
            <ScrollArea className="max-h-[calc(90vh-150px)] pr-4">
              <div className="space-y-4">
                {/* Order Items Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Order Items</Label>
                    {menuItems.length > 0 && (
                      <Popover open={showAddItem} onOpenChange={setShowAddItem}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Plus className="h-4 w-4" />
                            Add Item
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="end">
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-1">
                              {menuItems.map((item: any) => (
                                <Button
                                  key={item.id}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-between text-left"
                                  onClick={() => handleAddMenuItem(item)}
                                >
                                  <span className="truncate">{item.name}</span>
                                  <span className="text-muted-foreground text-xs">
                                    {currencySymbol}{(item.price || 0).toFixed(2)}
                                  </span>
                                </Button>
                              ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  
                  {(editingItems.length > 0 || newItems.length > 0) && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="w-20 text-center">Qty</TableHead>
                            <TableHead className="w-28 text-right">Price</TableHead>
                            <TableHead className="w-28 text-right">Total</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Existing Items */}
                          {editingItems.map((item, index) => (
                            <TableRow key={item.id || index}>
                              <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  className="h-8 w-16 text-center"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-8 w-24 text-right"
                                  value={item.unit_price}
                                  onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {currencySymbol}{(item.total_price || 0).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* New Items */}
                          {newItems.map((item, index) => (
                            <TableRow key={item.id} className="bg-green-50 dark:bg-green-950/20">
                              <TableCell className="font-medium text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">New</Badge>
                                  {item.item_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  className="h-8 w-16 text-center"
                                  value={item.quantity}
                                  onChange={(e) => handleNewItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-8 w-24 text-right"
                                  value={item.unit_price}
                                  onChange={(e) => handleNewItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {currencySymbol}{(item.total_price || 0).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleRemoveNewItem(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Order Type</Label>
                    <Select 
                      value={editingOrder.order_type} 
                      onValueChange={(v) => setEditingOrder({...editingOrder, order_type: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dine_in">Dine In</SelectItem>
                        <SelectItem value="takeaway">Takeaway</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="room_service">Room Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Table Number</Label>
                    <Input 
                      value={editingOrder.table_number || ''} 
                      onChange={(e) => setEditingOrder({...editingOrder, table_number: e.target.value})}
                      placeholder="e.g., T1, A5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={editingOrder.status} 
                      onValueChange={(v) => setEditingOrder({...editingOrder, status: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="served">Served</SelectItem>
                        <SelectItem value="billed">Billed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select 
                      value={editingOrder.payment_status} 
                      onValueChange={(v) => setEditingOrder({...editingOrder, payment_status: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select 
                      value={editingOrder.payment_mode || 'cash'} 
                      onValueChange={(v) => setEditingOrder({...editingOrder, payment_mode: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="room_charge">Room Charge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Lock className="h-3 w-3" /> GST/Tax Amount (Auto-calculated)
                    </Label>
                    <div className="relative">
                      <Input 
                        type="number"
                        step="0.01"
                        value={editingOrder.tax_amount?.toFixed(2) || '0.00'} 
                        readOnly
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    {/* Tax breakdown from admin settings */}
                    {editingOrder.subtotal > 0 && (
                      <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded p-2">
                        {getTaxBreakdownDisplay(editingOrder.subtotal).map((tax, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{tax.name} ({tax.percentage}%)</span>
                            <span>{currencySymbol}{tax.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        {getTaxBreakdownDisplay(editingOrder.subtotal).length === 0 && (
                          <span className="text-amber-600">No active taxes configured in admin settings</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Amount</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      min="0"
                      max={editingOrder.subtotal || 0}
                      value={editingOrder.discount_amount || 0} 
                      onChange={(e) => {
                        const discount = parseFloat(e.target.value) || 0;
                        // Prevent discount from exceeding subtotal (security check)
                        const maxDiscount = editingOrder.subtotal || 0;
                        setEditingOrder({...editingOrder, discount_amount: Math.min(Math.max(0, discount), maxDiscount)});
                      }}
                    />
                    {editingOrder.discount_amount > 0 && (
                      <p className="text-xs text-amber-600">
                        ⚠️ Discount applied - logged for audit
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea 
                      value={editingOrder.notes || ''} 
                      onChange={(e) => setEditingOrder({...editingOrder, notes: e.target.value})}
                      placeholder="Add order notes..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Security notice */}
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-xs">
                    All changes are logged with timestamps and user details for audit purposes. 
                    Tax is auto-calculated based on admin tax settings and cannot be manually edited.
                  </AlertDescription>
                </Alert>

                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{currencySymbol}{(editingOrder.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST/Tax (Auto):</span>
                    <span>{currencySymbol}{(editingOrder.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>-{currencySymbol}{(editingOrder.discount_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span className="text-green-600">
                      {currencySymbol}{((editingOrder.subtotal || 0) + (editingOrder.tax_amount || 0) - (editingOrder.discount_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingOrder(null); setEditingItems([]); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Denied Dialog */}
      <Dialog open={showPermissionDenied} onOpenChange={setShowPermissionDenied}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Lock className="h-5 w-5" />
              Permission Denied
            </DialogTitle>
            <DialogDescription>
              You do not have permission to edit orders. Please contact your administrator 
              to request the 'edit' permission for the {department} module.
            </DialogDescription>
          </DialogHeader>
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              Only staff members with explicit 'edit' permission or administrators can modify orders. 
              This restriction is in place for security and audit purposes.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={() => setShowPermissionDenied(false)}>
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}