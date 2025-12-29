import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBarOrders, useBarStats, useBarInventory, useBarMenu, useBarOrderItemsAll } from '@/hooks/useBarData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, FileText, Download, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  spirits: '#3b82f6',
  whisky: '#f59e0b',
  rum: '#10b981',
  vodka: '#8b5cf6',
  gin: '#ec4899',
  brandy: '#ef4444',
  tequila: '#14b8a6',
  beer: '#84cc16',
  wine: '#a855f7',
  mixer: '#06b6d4',
  soft_drinks: '#f97316',
  snacks: '#64748b',
  cocktails: '#e11d48',
  mocktails: '#0ea5e9',
  food: '#22c55e',
  default: '#6b7280',
};

export default function BarReports() {
  const { data: orders = [] } = useBarOrders('all');
  const { data: inventory = [] } = useBarInventory();
  const { data: menuItems = [] } = useBarMenu();
  const { data: allOrderItems = [] } = useBarOrderItemsAll();
  const { data: stats } = useBarStats();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'custom'>('today');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Filter orders by date range
  const getFilteredOrders = () => {
    const now = new Date();
    let filterStart = startOfDay(now);
    let filterEnd = endOfDay(now);
    
    if (dateRange === '7days') {
      filterStart = startOfDay(subDays(now, 7));
    } else if (dateRange === '30days') {
      filterStart = startOfDay(subDays(now, 30));
    } else if (dateRange === 'custom') {
      filterStart = startOfDay(startDate);
      filterEnd = endOfDay(endDate);
    }
    
    return orders.filter(o => 
      isWithinInterval(new Date(o.created_at), { start: filterStart, end: filterEnd })
    );
  };

  const filteredOrders = getFilteredOrders();
  const paidOrders = filteredOrders.filter(o => o.payment_status === 'paid');

  // P&L Calculations
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const grossProfit = totalRevenue - (totalRevenue * 0.35);
  const taxCollected = paidOrders.reduce((sum, o) => sum + Number(o.tax_amount), 0);
  const netProfit = grossProfit - taxCollected;

  // Daily sales data
  const getDayCount = () => {
    if (dateRange === 'today') return 1;
    if (dateRange === '7days') return 7;
    if (dateRange === '30days') return 30;
    const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  };

  const dailySales = Array.from({ length: getDayCount() }, (_, i) => {
    const date = dateRange === 'custom' 
      ? new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      : subDays(new Date(), getDayCount() - 1 - i);
    const dayOrders = orders.filter(o => 
      format(new Date(o.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') &&
      o.payment_status === 'paid'
    );
    return {
      date: format(date, 'dd MMM'),
      revenue: dayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
      orders: dayOrders.length,
    };
  });

  // Category-wise revenue from actual order data
  const categoryRevenue = useMemo(() => {
    // Get paid order IDs
    const paidOrderIds = new Set(paidOrders.map(o => o.id));
    
    // Create a map of menu item id to category
    const menuItemCategoryMap = new Map<string, string>();
    menuItems.forEach(item => {
      menuItemCategoryMap.set(item.id, item.category);
    });
    
    // Calculate revenue per category from order items
    const categoryRevenueMap = new Map<string, number>();
    
    allOrderItems.forEach(item => {
      // Only count items from paid orders within date range
      if (paidOrderIds.has(item.order_id)) {
        const category = item.menu_item_id 
          ? menuItemCategoryMap.get(item.menu_item_id) || 'other'
          : 'other';
        const currentRevenue = categoryRevenueMap.get(category) || 0;
        categoryRevenueMap.set(category, currentRevenue + Number(item.total_price));
      }
    });
    
    // Convert to array format for chart
    const result = Array.from(categoryRevenueMap.entries())
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
        value,
        color: CATEGORY_COLORS[name.toLowerCase()] || CATEGORY_COLORS.default,
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
    
    return result;
  }, [paidOrders, allOrderItems, menuItems]);

  // Order type breakdown
  const orderTypeData = [
    { name: 'Dine In', count: filteredOrders.filter(o => o.order_type === 'dine_in').length, revenue: filteredOrders.filter(o => o.order_type === 'dine_in' && o.payment_status === 'paid').reduce((s, o) => s + Number(o.total_amount), 0) },
    { name: 'Room Service', count: filteredOrders.filter(o => o.order_type === 'room_service').length, revenue: filteredOrders.filter(o => o.order_type === 'room_service' && o.payment_status === 'paid').reduce((s, o) => s + Number(o.total_amount), 0) },
    { name: 'Takeaway', count: filteredOrders.filter(o => o.order_type === 'takeaway').length, revenue: filteredOrders.filter(o => o.order_type === 'takeaway' && o.payment_status === 'paid').reduce((s, o) => s + Number(o.total_amount), 0) },
  ];

  // Payment mode breakdown
  const paymentModeData = [
    { name: 'Cash', value: paidOrders.filter(o => o.payment_mode === 'cash').length, color: '#10b981' },
    { name: 'Card', value: paidOrders.filter(o => o.payment_mode === 'card').length, color: '#3b82f6' },
    { name: 'UPI', value: paidOrders.filter(o => o.payment_mode === 'upi').length, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  // Stock value
  const totalStockValue = inventory.reduce((sum, i) => sum + (Number(i.selling_price) * Number(i.current_stock)), 0);
  const totalStockCost = inventory.reduce((sum, i) => sum + (Number(i.cost_price) * Number(i.current_stock)), 0);

  // Export to PDF
  const exportToPDF = (reportType: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.text(settings?.hotel_name || 'Bar', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${reportType} Report`, pageWidth / 2, 30, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Date Range: ${getDateRangeText()}`, pageWidth / 2, 38, { align: 'center' });
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 44, { align: 'center' });

    let tableData: any[][] = [];
    let headers: string[] = [];

    if (reportType === 'P&L') {
      headers = ['Particulars', 'Amount'];
      tableData = [
        ['Total Sales Revenue', `${currencySymbol}${totalRevenue.toFixed(2)}`],
        ['Less: Cost of Goods Sold (Est. 35%)', `-${currencySymbol}${(totalRevenue * 0.35).toFixed(2)}`],
        ['Gross Profit', `${currencySymbol}${grossProfit.toFixed(2)}`],
        ['Less: Tax Collected (GST)', `-${currencySymbol}${taxCollected.toFixed(2)}`],
        ['Net Profit', `${currencySymbol}${netProfit.toFixed(2)}`],
      ];
    } else if (reportType === 'Sales') {
      headers = ['Order Type', 'Orders', 'Revenue', 'Avg. Order Value'];
      tableData = orderTypeData.map(t => [
        t.name,
        t.count.toString(),
        `${currencySymbol}${t.revenue.toFixed(2)}`,
        `${currencySymbol}${t.count > 0 ? (t.revenue / t.count).toFixed(2) : '0.00'}`
      ]);
      tableData.push(['Total', filteredOrders.length.toString(), `${currencySymbol}${totalRevenue.toFixed(2)}`, `${currencySymbol}${filteredOrders.length > 0 ? (totalRevenue / filteredOrders.length).toFixed(2) : '0.00'}`]);
    } else if (reportType === 'Stock') {
      headers = ['Item', 'Category', 'Stock', 'Cost Price', 'Sell Price', 'Stock Value'];
      tableData = inventory.map(i => [
        i.name,
        i.category,
        `${i.current_stock} ${i.unit}`,
        `${currencySymbol}${i.cost_price}`,
        `${currencySymbol}${i.selling_price}`,
        `${currencySymbol}${(Number(i.selling_price) * Number(i.current_stock)).toFixed(2)}`
      ]);
    } else if (reportType === 'Orders') {
      headers = ['Order No', 'Date', 'Type', 'Table', 'Status', 'Amount'];
      tableData = filteredOrders.map(o => [
        o.order_number,
        format(new Date(o.created_at), 'dd/MM/yyyy HH:mm'),
        o.order_type.replace('_', ' '),
        o.table_number || '-',
        o.payment_status,
        `${currencySymbol}${o.total_amount.toFixed(2)}`
      ]);
    }

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 50,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`${reportType.toLowerCase()}_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  // Export to Excel
  const exportToExcel = (reportType: string) => {
    let data: any[] = [];

    if (reportType === 'P&L') {
      data = [
        { Particulars: 'Total Sales Revenue', Amount: totalRevenue },
        { Particulars: 'Less: Cost of Goods Sold (Est. 35%)', Amount: -(totalRevenue * 0.35) },
        { Particulars: 'Gross Profit', Amount: grossProfit },
        { Particulars: 'Less: Tax Collected (GST)', Amount: -taxCollected },
        { Particulars: 'Net Profit', Amount: netProfit },
      ];
    } else if (reportType === 'Sales') {
      data = orderTypeData.map(t => ({
        'Order Type': t.name,
        'Orders': t.count,
        'Revenue': t.revenue,
        'Avg Order Value': t.count > 0 ? t.revenue / t.count : 0
      }));
    } else if (reportType === 'Stock') {
      data = inventory.map(i => ({
        'Item': i.name,
        'Category': i.category,
        'Stock': i.current_stock,
        'Unit': i.unit,
        'Cost Price': i.cost_price,
        'Selling Price': i.selling_price,
        'Stock Value': Number(i.selling_price) * Number(i.current_stock)
      }));
    } else if (reportType === 'Orders') {
      data = filteredOrders.map(o => ({
        'Order No': o.order_number,
        'Date': format(new Date(o.created_at), 'dd/MM/yyyy HH:mm'),
        'Type': o.order_type.replace('_', ' '),
        'Table': o.table_number || '-',
        'Status': o.status,
        'Payment Status': o.payment_status,
        'Subtotal': o.subtotal,
        'Tax': o.tax_amount,
        'Total': o.total_amount
      }));
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportType);
    XLSX.writeFile(wb, `${reportType.toLowerCase()}_report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const getDateRangeText = () => {
    if (dateRange === 'today') return format(new Date(), 'dd MMM yyyy');
    if (dateRange === '7days') return `${format(subDays(new Date(), 7), 'dd MMM')} - ${format(new Date(), 'dd MMM yyyy')}`;
    if (dateRange === '30days') return `${format(subDays(new Date(), 30), 'dd MMM')} - ${format(new Date(), 'dd MMM yyyy')}`;
    return `${format(startDate, 'dd MMM yyyy')} - ${format(endDate, 'dd MMM yyyy')}`;
  };

  return (
    <DashboardLayout title="Bar Reports" subtitle="P/L analysis and detailed reports">
      {/* Date Range Filter & Export */}
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRange === 'custom' && (
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> Export PDF
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="grid gap-1">
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToPDF('P&L')}>P&L Report</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToPDF('Sales')}>Sales Report</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToPDF('Stock')}>Stock Report</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToPDF('Orders')}>Orders List</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> Export Excel
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="grid gap-1">
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToExcel('P&L')}>P&L Report</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToExcel('Sales')}>Sales Report</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToExcel('Stock')}>Stock Report</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToExcel('Orders')}>Orders List</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Tabs defaultValue="pnl" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="pnl">P/L Report</TabsTrigger>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="items">Item Report</TabsTrigger>
          <TabsTrigger value="stock">Stock Report</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* P&L Report */}
        <TabsContent value="pnl" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-emerald-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-emerald-500">{currencySymbol}{totalRevenue.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <DollarSign className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Profit</p>
                    <p className="text-2xl font-bold text-blue-500">{currencySymbol}{grossProfit.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <FileText className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tax Collected</p>
                    <p className="text-2xl font-bold text-amber-500">{currencySymbol}{taxCollected.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={netProfit >= 0 ? "border-emerald-500/30" : "border-red-500/30"}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    {netProfit >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {currencySymbol}{netProfit.toFixed(0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Total Sales Revenue</TableCell>
                    <TableCell className="text-right text-emerald-500">{currencySymbol}{totalRevenue.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Less: Cost of Goods Sold (Est. 35%)</TableCell>
                    <TableCell className="text-right text-red-500">-{currencySymbol}{(totalRevenue * 0.35).toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-bold">Gross Profit</TableCell>
                    <TableCell className="text-right font-bold">{currencySymbol}{grossProfit.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Less: Tax Collected (GST)</TableCell>
                    <TableCell className="text-right text-amber-500">-{currencySymbol}{taxCollected.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/10">
                    <TableCell className="font-bold text-lg">Net Profit</TableCell>
                    <TableCell className={`text-right font-bold text-lg ${netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {currencySymbol}{netProfit.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Daily Sales Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Payment Mode Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={paymentModeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                      {paymentModeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-4">
                  {paymentModeData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-sm">{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Sales by Order Type</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Type</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg. Order Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderTypeData.map((type) => (
                    <TableRow key={type.name}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell className="text-right">{type.count}</TableCell>
                      <TableCell className="text-right">{currencySymbol}{type.revenue.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{currencySymbol}{type.count > 0 ? (type.revenue / type.count).toFixed(2) : '0.00'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{filteredOrders.length}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{totalRevenue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{filteredOrders.length > 0 ? (totalRevenue / filteredOrders.length).toFixed(2) : '0.00'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Item Report */}
        <TabsContent value="items" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Category-wise Revenue</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {categoryRevenue.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Menu Items ({menuItems.length})</CardTitle></CardHeader>
              <CardContent className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.slice(0, 20).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="capitalize">{item.category}</TableCell>
                        <TableCell className="text-right">{currencySymbol}{item.price}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${item.is_available ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock Report */}
        <TabsContent value="stock" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Package className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold">{inventory.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stock Value (Selling)</p>
                    <p className="text-2xl font-bold text-emerald-500">{currencySymbol}{totalStockValue.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <TrendingDown className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stock Cost</p>
                    <p className="text-2xl font-bold text-amber-500">{currencySymbol}{totalStockCost.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Inventory Status</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Min Level</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Sell Price</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => {
                    const stockValue = Number(item.selling_price) * Number(item.current_stock);
                    const isLow = item.current_stock <= item.min_stock_level;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="capitalize">{item.category}</TableCell>
                        <TableCell className="text-right">{item.current_stock} {item.unit}</TableCell>
                        <TableCell className="text-right">{item.min_stock_level}</TableCell>
                        <TableCell className="text-right">{currencySymbol}{item.cost_price}</TableCell>
                        <TableCell className="text-right">{currencySymbol}{item.selling_price}</TableCell>
                        <TableCell className="text-right">{currencySymbol}{stockValue.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${isLow ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                            {isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary */}
        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-3xl font-bold">{filteredOrders.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-3xl font-bold text-emerald-500">{currencySymbol}{totalRevenue.toFixed(0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                <p className="text-3xl font-bold text-blue-500">{currencySymbol}{filteredOrders.length > 0 ? (totalRevenue / filteredOrders.length).toFixed(0) : 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Package className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-3xl font-bold text-amber-500">{stats?.lowStockItems || 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold">{paidOrders.length}</p>
                  <p className="text-sm text-muted-foreground">Paid Orders</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold">{filteredOrders.filter(o => o.payment_status === 'pending').length}</p>
                  <p className="text-sm text-muted-foreground">Pending Bills</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold">{inventory.length}</p>
                  <p className="text-sm text-muted-foreground">Inventory Items</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold">{menuItems.length}</p>
                  <p className="text-sm text-muted-foreground">Menu Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}