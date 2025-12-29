import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Download, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Minus, 
  Search, Filter, ChevronLeft, ChevronRight, Eye, Clock, DollarSign, ShoppingCart 
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, AreaChart, Area } from "recharts";
import { format, parseISO, isWithinInterval } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SalesReportContentProps {
  orders: any[];
  currencySymbol: string;
  department: string;
  startDate: Date;
  endDate: Date;
  allOrders?: any[];
  isCompareMode?: boolean;
  comparisonType?: 'previous' | 'last_week' | 'last_month' | 'last_year';
}

const COLORS = ["hsl(var(--primary))", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(280, 65%, 60%)", "hsl(0, 72%, 51%)"];

// Helper to get comparison period
function getComparisonPeriodDates(startDate: Date, endDate: Date, comparisonType: string) {
  const periodLength = endDate.getTime() - startDate.getTime();
  
  switch (comparisonType) {
    case 'previous':
      return {
        start: new Date(startDate.getTime() - periodLength),
        end: new Date(startDate.getTime() - 1),
      };
    case 'last_week':
      const lastWeekStart = new Date(startDate);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(endDate);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
      return { start: lastWeekStart, end: lastWeekEnd };
    case 'last_month':
      const lastMonthStart = new Date(startDate);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      const lastMonthEnd = new Date(endDate);
      lastMonthEnd.setMonth(lastMonthEnd.getMonth() - 1);
      return { start: lastMonthStart, end: lastMonthEnd };
    case 'last_year':
      const lastYearStart = new Date(startDate);
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
      const lastYearEnd = new Date(endDate);
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
      return { start: lastYearStart, end: lastYearEnd };
    default:
      return { start: new Date(startDate.getTime() - periodLength), end: startDate };
  }
}

export function SalesReportContent({ 
  orders, 
  currencySymbol, 
  department,
  startDate,
  endDate,
  allOrders = [],
  isCompareMode = false,
  comparisonType = 'previous',
}: SalesReportContentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const itemsPerPage = 15;

  // Comparison period data
  const comparison = useMemo(() => {
    if (!isCompareMode || allOrders.length === 0) return null;
    
    const { start, end } = getComparisonPeriodDates(startDate, endDate, comparisonType);
    const prevOrders = allOrders.filter(order => {
      const orderDate = parseISO(order.created_at || "");
      return isWithinInterval(orderDate, { start, end });
    });

    const prevTotal = prevOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const prevCount = prevOrders.length;
    const prevAvg = prevCount > 0 ? prevTotal / prevCount : 0;

    return {
      orders: prevOrders,
      totalSales: prevTotal,
      orderCount: prevCount,
      avgOrderValue: prevAvg,
    };
  }, [isCompareMode, allOrders, startDate, endDate, comparisonType]);

  // Current period stats
  const totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalSales / orders.length : 0;

  // Calculate changes
  const getChange = (current: number, previous: number) => {
    if (previous === 0) return { value: current, percentage: current > 0 ? 100 : 0 };
    const percentage = ((current - previous) / previous) * 100;
    return { value: current - previous, percentage };
  };

  const salesChange = comparison ? getChange(totalSales, comparison.totalSales) : null;
  const ordersChange = comparison ? getChange(orders.length, comparison.orderCount) : null;
  const avgChange = comparison ? getChange(avgOrderValue, comparison.avgOrderValue) : null;

  // Daily sales data with comparison
  const dailySalesData = useMemo(() => {
    const dailyMap = new Map<string, { current: number; previous: number }>();
    
    orders.forEach(order => {
      const date = format(parseISO(order.created_at), "MMM dd");
      const existing = dailyMap.get(date) || { current: 0, previous: 0 };
      dailyMap.set(date, { ...existing, current: existing.current + (order.total_amount || 0) });
    });

    if (comparison) {
      comparison.orders.forEach(order => {
        const date = format(parseISO(order.created_at), "MMM dd");
        const existing = dailyMap.get(date) || { current: 0, previous: 0 };
        dailyMap.set(date, { ...existing, previous: existing.previous + (order.total_amount || 0) });
      });
    }
    
    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      current: data.current,
      previous: data.previous,
    }));
  }, [orders, comparison]);

  // Payment mode distribution
  const paymentModeData = useMemo(() => {
    const modeMap = new Map<string, number>();
    orders.forEach(order => {
      const mode = order.payment_mode || "Unknown";
      modeMap.set(mode, (modeMap.get(mode) || 0) + (order.total_amount || 0));
    });
    return Array.from(modeMap.entries()).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Order type breakdown
  const orderTypeData = useMemo(() => {
    const typeMap = new Map<string, { count: number; amount: number }>();
    orders.forEach(order => {
      const type = order.order_type || "Unknown";
      const existing = typeMap.get(type) || { count: 0, amount: 0 };
      typeMap.set(type, {
        count: existing.count + 1,
        amount: existing.amount + (order.total_amount || 0),
      });
    });
    return Array.from(typeMap.entries()).map(([type, data]) => ({ type, ...data }));
  }, [orders]);

  // Hourly distribution
  const hourlyData = useMemo(() => {
    const hourMap = new Map<number, { count: number; amount: number }>();
    orders.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      const existing = hourMap.get(hour) || { count: 0, amount: 0 };
      hourMap.set(hour, {
        count: existing.count + 1,
        amount: existing.amount + (order.total_amount || 0),
      });
    });
    
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      count: hourMap.get(i)?.count || 0,
      amount: hourMap.get(i)?.amount || 0,
    })).filter(h => h.count > 0);
  }, [orders]);

  // Filtered and sorted orders for history
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];
    
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.table_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    if (paymentFilter !== "all") {
      filtered = filtered.filter(order => order.payment_status === paymentFilter);
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
  }, [orders, searchTerm, statusFilter, paymentFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const uniqueStatuses = [...new Set(orders.map(o => o.status))].filter(Boolean);
  const uniquePaymentStatuses = [...new Set(orders.map(o => o.payment_status))].filter(Boolean);

  const renderChangeIndicator = (change: { value: number; percentage: number } | null) => {
    if (!change) return null;
    const isNeutral = Math.abs(change.percentage) < 0.1;
    
    if (isNeutral) return <Minus className="h-4 w-4 text-muted-foreground" />;
    
    return change.percentage > 0 ? (
      <span className="flex items-center text-green-600 text-sm">
        <ArrowUp className="h-3 w-3" />
        {Math.abs(change.percentage).toFixed(1)}%
      </span>
    ) : (
      <span className="flex items-center text-red-600 text-sm">
        <ArrowDown className="h-3 w-3" />
        {Math.abs(change.percentage).toFixed(1)}%
      </span>
    );
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${department} Sales Report`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${format(startDate, "MMM dd, yyyy")} - ${format(endDate, "MMM dd, yyyy")}`, 14, 30);
    
    // Summary
    doc.text(`Total Sales: ${currencySymbol}${totalSales.toFixed(2)}`, 14, 40);
    doc.text(`Total Orders: ${orders.length}`, 14, 46);
    doc.text(`Average Order: ${currencySymbol}${avgOrderValue.toFixed(2)}`, 14, 52);
    
    autoTable(doc, {
      startY: 60,
      head: [["Order Type", "Orders", "Amount", "Avg Value"]],
      body: orderTypeData.map(row => [
        row.type,
        row.count,
        `${currencySymbol}${row.amount.toFixed(2)}`,
        `${currencySymbol}${(row.amount / row.count).toFixed(2)}`,
      ]),
    });

    // Order history
    const historyY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Order History", 14, historyY);
    autoTable(doc, {
      startY: historyY + 5,
      head: [["Order #", "Date", "Type", "Status", "Amount"]],
      body: filteredOrders.slice(0, 50).map(order => [
        order.order_number,
        format(parseISO(order.created_at), "MMM dd, HH:mm"),
        order.order_type || "-",
        order.status,
        `${currencySymbol}${(order.total_amount || 0).toFixed(2)}`,
      ]),
    });
    
    doc.save(`${department}_Sales_Report.pdf`);
  };

  const exportExcel = () => {
    const summaryData = orderTypeData.map(row => ({
      "Order Type": row.type,
      "Order Count": row.count,
      "Total Amount": row.amount,
      "Avg Value": row.amount / row.count,
    }));
    
    const historyData = filteredOrders.map(order => ({
      "Order Number": order.order_number,
      "Date": format(parseISO(order.created_at), "yyyy-MM-dd HH:mm"),
      "Type": order.order_type || "-",
      "Table": order.table_number || "-",
      "Status": order.status,
      "Payment Status": order.payment_status,
      "Subtotal": order.subtotal || 0,
      "Tax": order.tax_amount || 0,
      "Discount": order.discount_amount || 0,
      "Total": order.total_amount || 0,
    }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyData), "Order History");
    XLSX.writeFile(wb, `${department}_Sales_Report.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Summary Cards with Comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="text-xl font-bold text-green-600">
                    {currencySymbol}{totalSales.toFixed(2)}
                  </p>
                </div>
              </div>
              {isCompareMode && renderChangeIndicator(salesChange)}
            </div>
            {comparison && (
              <p className="text-xs text-muted-foreground mt-2">
                Previous: {currencySymbol}{comparison.totalSales.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                  <p className="text-xl font-bold text-blue-600">{orders.length}</p>
                </div>
              </div>
              {isCompareMode && renderChangeIndicator(ordersChange)}
            </div>
            {comparison && (
              <p className="text-xs text-muted-foreground mt-2">
                Previous: {comparison.orderCount}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Order Value</p>
                  <p className="text-xl font-bold text-purple-600">
                    {currencySymbol}{avgOrderValue.toFixed(2)}
                  </p>
                </div>
              </div>
              {isCompareMode && renderChangeIndicator(avgChange)}
            </div>
            {comparison && (
              <p className="text-xs text-muted-foreground mt-2">
                Previous: {currencySymbol}{comparison.avgOrderValue.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Peak Hour</p>
                <p className="text-xl font-bold text-amber-600">
                  {hourlyData.length > 0 
                    ? hourlyData.reduce((max, h) => h.count > max.count ? h : max, hourlyData[0]).hour
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="history">Order History ({filteredOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Sales Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailySalesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        formatter={(value: number, name: string) => [
                          `${currencySymbol}${value.toFixed(2)}`, 
                          name === "current" ? "Current" : "Previous"
                        ]}
                      />
                      <Area type="monotone" dataKey="current" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
                      {isCompareMode && (
                        <Area type="monotone" dataKey="previous" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
                      )}
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Mode Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentModeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {paymentModeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, "Amount"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hourly Sales Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        formatter={(value: number, name: string) => [
                          name === "amount" ? `${currencySymbol}${value.toFixed(2)}` : value,
                          name === "amount" ? "Sales" : "Orders"
                        ]}
                      />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales by Order Type</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Orders</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Avg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderTypeData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      orderTypeData.map((row) => (
                        <TableRow key={row.type}>
                          <TableCell className="font-medium capitalize">{row.type}</TableCell>
                          <TableCell className="text-center">{row.count}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {currencySymbol}{row.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {currencySymbol}{(row.amount / row.count).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search order # or table..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    {uniquePaymentStatuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Order History Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          if (sortField === "order_number") {
                            setSortDirection(d => d === "asc" ? "desc" : "asc");
                          } else {
                            setSortField("order_number");
                            setSortDirection("asc");
                          }
                        }}
                      >
                        Order #
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          if (sortField === "created_at") {
                            setSortDirection(d => d === "asc" ? "desc" : "asc");
                          } else {
                            setSortField("created_at");
                            setSortDirection("desc");
                          }
                        }}
                      >
                        Date/Time
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          if (sortField === "total_amount") {
                            setSortDirection(d => d === "asc" ? "desc" : "asc");
                          } else {
                            setSortField("total_amount");
                            setSortDirection("desc");
                          }
                        }}
                      >
                        Total
                      </TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                          No orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(parseISO(order.created_at), "MMM dd, HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{order.order_type || "-"}</Badge>
                          </TableCell>
                          <TableCell>{order.table_number || "-"}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={order.status === "completed" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}
                              className="capitalize"
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={order.payment_status === "paid" ? "default" : "outline"}
                              className="capitalize"
                            >
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
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
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
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{format(parseISO(selectedOrder.created_at), "MMM dd, yyyy HH:mm")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{selectedOrder.order_type || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Table</p>
                  <p className="font-medium">{selectedOrder.table_number || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className="capitalize">{selectedOrder.status}</Badge>
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{currencySymbol}{(selectedOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{currencySymbol}{(selectedOrder.tax_amount || 0).toFixed(2)}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount</span>
                    <span>-{currencySymbol}{selectedOrder.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span className="text-green-600">{currencySymbol}{(selectedOrder.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Status</span>
                <Badge variant={selectedOrder.payment_status === "paid" ? "default" : "outline"}>
                  {selectedOrder.payment_status}
                </Badge>
              </div>
              {selectedOrder.payment_mode && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Mode</span>
                  <span className="capitalize">{selectedOrder.payment_mode}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}