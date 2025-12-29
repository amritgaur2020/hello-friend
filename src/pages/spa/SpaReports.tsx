import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSpaBookings, useSpaInventory, useSpaServices } from '@/hooks/useDepartmentData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, getHours, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Package, CalendarDays, FileText, Download, CalendarIcon, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const CATEGORY_COLORS: Record<string, string> = {
  massage: '#ec4899',
  facial: '#8b5cf6',
  body_treatment: '#06b6d4',
  hair: '#f59e0b',
  nails: '#10b981',
  wellness: '#3b82f6',
  default: '#6b7280',
};

export default function SpaReports() {
  const { data: bookings = [] } = useSpaBookings('all');
  const { data: inventory = [] } = useSpaInventory();
  const { data: services = [] } = useSpaServices();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'custom'>('today');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const getFilteredBookings = () => {
    const now = new Date();
    let filterStart = startOfDay(now);
    let filterEnd = endOfDay(now);
    
    if (dateRange === '7days') filterStart = startOfDay(subDays(now, 7));
    else if (dateRange === '30days') filterStart = startOfDay(subDays(now, 30));
    else if (dateRange === 'custom') {
      filterStart = startOfDay(startDate);
      filterEnd = endOfDay(endDate);
    }
    
    return bookings.filter(b => {
      const bookingDate = parseISO(b.booking_date);
      return isWithinInterval(bookingDate, { start: filterStart, end: filterEnd });
    });
  };

  const filteredBookings = getFilteredBookings();
  const paidBookings = filteredBookings.filter(b => b.payment_status === 'paid');

  const totalRevenue = paidBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const grossProfit = totalRevenue - (totalRevenue * 0.30);
  const taxCollected = paidBookings.reduce((sum, b) => sum + Number(b.tax_amount || 0), 0);
  const netProfit = grossProfit - taxCollected;

  const getDayCount = () => {
    if (dateRange === 'today') return 1;
    if (dateRange === '7days') return 7;
    if (dateRange === '30days') return 30;
    return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  const dailySales = Array.from({ length: getDayCount() }, (_, i) => {
    const date = dateRange === 'custom' ? new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000) : subDays(new Date(), getDayCount() - 1 - i);
    const dayBookings = bookings.filter(b => b.booking_date === format(date, 'yyyy-MM-dd') && b.payment_status === 'paid');
    return { date: format(date, 'dd MMM'), revenue: dayBookings.reduce((sum, b) => sum + Number(b.total_amount), 0), bookings: dayBookings.length };
  });

  const hourlySales = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayBookings = bookings.filter(b => b.booking_date === today && b.payment_status === 'paid');
    
    return Array.from({ length: 24 }, (_, hour) => {
      const hourBookings = todayBookings.filter(b => {
        const startHour = parseInt(b.start_time.split(':')[0], 10);
        return startHour === hour;
      });
      return { hour: `${hour.toString().padStart(2, '0')}:00`, revenue: hourBookings.reduce((sum, b) => sum + Number(b.total_amount), 0), bookings: hourBookings.length };
    }).filter(h => h.revenue > 0 || h.bookings > 0);
  }, [bookings]);

  const serviceRevenue = useMemo(() => {
    const serviceMap = new Map<string, { name: string; category: string; revenue: number; count: number }>();
    
    paidBookings.forEach(booking => {
      const service = services.find(s => s.id === booking.service_id);
      if (service) {
        const existing = serviceMap.get(service.id) || { name: service.name, category: service.category || 'other', revenue: 0, count: 0 };
        existing.revenue += Number(booking.total_amount);
        existing.count += 1;
        serviceMap.set(service.id, existing);
      }
    });

    return Array.from(serviceMap.values())
      .map(s => ({ ...s, color: CATEGORY_COLORS[s.category.toLowerCase()] || CATEGORY_COLORS.default }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [paidBookings, services]);

  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    services.forEach(s => {
      const cat = s.category || 'other';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
      value,
      color: CATEGORY_COLORS[name.toLowerCase()] || CATEGORY_COLORS.default,
    }));
  }, [services]);

  const statusData = [
    { name: 'Completed', value: filteredBookings.filter(b => b.status === 'completed').length, color: '#10b981' },
    { name: 'Confirmed', value: filteredBookings.filter(b => b.status === 'confirmed').length, color: '#3b82f6' },
    { name: 'Pending', value: filteredBookings.filter(b => b.status === 'pending').length, color: '#f59e0b' },
    { name: 'Cancelled', value: filteredBookings.filter(b => b.status === 'cancelled').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const paymentModeData = [
    { name: 'Cash', value: paidBookings.filter(b => b.payment_mode === 'cash').length, color: '#10b981' },
    { name: 'Card', value: paidBookings.filter(b => b.payment_mode === 'card').length, color: '#3b82f6' },
    { name: 'UPI', value: paidBookings.filter(b => b.payment_mode === 'upi').length, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  const totalStockValue = inventory.reduce((sum, i) => sum + (Number(i.selling_price || 0) * Number(i.current_stock)), 0);
  const totalStockCost = inventory.reduce((sum, i) => sum + (Number(i.cost_price) * Number(i.current_stock)), 0);

  const exportToPDF = (reportType: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.text(settings?.hotel_name || 'Spa', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${reportType} Report`, pageWidth / 2, 30, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Date Range: ${getDateRangeText()}`, pageWidth / 2, 38, { align: 'center' });

    let tableData: string[][] = [];
    let headers: string[] = [];

    if (reportType === 'P&L') {
      headers = ['Particulars', 'Amount'];
      tableData = [
        ['Total Revenue', `${currencySymbol}${totalRevenue.toFixed(2)}`],
        ['Less: Cost (Est. 30%)', `-${currencySymbol}${(totalRevenue * 0.30).toFixed(2)}`],
        ['Gross Profit', `${currencySymbol}${grossProfit.toFixed(2)}`],
        ['Less: Tax Collected', `-${currencySymbol}${taxCollected.toFixed(2)}`],
        ['Net Profit', `${currencySymbol}${netProfit.toFixed(2)}`],
      ];
    } else if (reportType === 'Services') {
      headers = ['Service', 'Category', 'Bookings', 'Revenue'];
      tableData = serviceRevenue.map(s => [s.name, s.category, s.count.toString(), `${currencySymbol}${s.revenue.toFixed(2)}`]);
    }

    autoTable(doc, { head: [headers], body: tableData, startY: 50, styles: { fontSize: 9 }, headStyles: { fillColor: [236, 72, 153] } });
    doc.save(`spa_${reportType.toLowerCase()}_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const exportToExcel = (reportType: string) => {
    let data: Record<string, unknown>[] = [];

    if (reportType === 'P&L') {
      data = [
        { Particulars: 'Total Revenue', Amount: totalRevenue },
        { Particulars: 'Less: Cost (Est. 30%)', Amount: -(totalRevenue * 0.30) },
        { Particulars: 'Gross Profit', Amount: grossProfit },
        { Particulars: 'Less: Tax Collected', Amount: -taxCollected },
        { Particulars: 'Net Profit', Amount: netProfit },
      ];
    } else if (reportType === 'Services') {
      data = serviceRevenue.map(s => ({ 'Service': s.name, 'Category': s.category, 'Bookings': s.count, 'Revenue': s.revenue }));
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportType);
    XLSX.writeFile(wb, `spa_${reportType.toLowerCase()}_report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const getDateRangeText = () => {
    if (dateRange === 'today') return format(new Date(), 'dd MMM yyyy');
    if (dateRange === '7days') return `${format(subDays(new Date(), 7), 'dd MMM')} - ${format(new Date(), 'dd MMM yyyy')}`;
    if (dateRange === '30days') return `${format(subDays(new Date(), 30), 'dd MMM')} - ${format(new Date(), 'dd MMM yyyy')}`;
    return `${format(startDate, 'dd MMM yyyy')} - ${format(endDate, 'dd MMM yyyy')}`;
  };

  return (
    <DashboardLayout title="Spa Reports" subtitle="P/L analysis and detailed reports">
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={dateRange} onValueChange={(v: 'today' | '7days' | '30days' | 'custom') => setDateRange(v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
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
                    <CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "dd/MM/yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus /></PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "dd/MM/yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus /></PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Export PDF</Button></PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="grid gap-1">
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToPDF('P&L')}>P&L Report</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToPDF('Services')}>Services Report</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Export Excel</Button></PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="grid gap-1">
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToExcel('P&L')}>P&L Report</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToExcel('Services')}>Services Report</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Tabs defaultValue="pnl" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="pnl">P/L Report</TabsTrigger>
          <TabsTrigger value="hourly">Hourly Trend</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="stock">Stock Report</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-pink-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/20"><TrendingUp className="h-5 w-5 text-pink-500" /></div>
                  <div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold text-pink-500">{currencySymbol}{totalRevenue.toFixed(0)}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20"><DollarSign className="h-5 w-5 text-purple-500" /></div>
                  <div><p className="text-sm text-muted-foreground">Gross Profit</p><p className="text-2xl font-bold text-purple-500">{currencySymbol}{grossProfit.toFixed(0)}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20"><FileText className="h-5 w-5 text-amber-500" /></div>
                  <div><p className="text-sm text-muted-foreground">Tax Collected</p><p className="text-2xl font-bold text-amber-500">{currencySymbol}{taxCollected.toFixed(0)}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className={netProfit >= 0 ? "border-emerald-500/30" : "border-red-500/30"}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    {netProfit >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
                  </div>
                  <div><p className="text-sm text-muted-foreground">Net Profit</p><p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{currencySymbol}{netProfit.toFixed(0)}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Profit & Loss Statement</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Particulars</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow><TableCell className="font-medium">Total Revenue</TableCell><TableCell className="text-right text-pink-500">{currencySymbol}{totalRevenue.toFixed(2)}</TableCell></TableRow>
                  <TableRow><TableCell className="font-medium">Less: Service Cost (Est. 30%)</TableCell><TableCell className="text-right text-red-500">-{currencySymbol}{(totalRevenue * 0.30).toFixed(2)}</TableCell></TableRow>
                  <TableRow className="bg-muted/30"><TableCell className="font-bold">Gross Profit</TableCell><TableCell className="text-right font-bold">{currencySymbol}{grossProfit.toFixed(2)}</TableCell></TableRow>
                  <TableRow><TableCell className="font-medium">Less: Tax Collected</TableCell><TableCell className="text-right text-amber-500">-{currencySymbol}{taxCollected.toFixed(2)}</TableCell></TableRow>
                  <TableRow className="bg-pink-500/10"><TableCell className="font-bold text-lg">Net Profit</TableCell><TableCell className={`text-right font-bold text-lg ${netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{currencySymbol}{netProfit.toFixed(2)}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hourly" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Hourly Booking Trend (Today)</CardTitle></CardHeader>
            <CardContent>
              {hourlySales.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">No bookings for today</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={hourlySales}>
                    <defs>
                      <linearGradient id="spaHourlyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/><stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" /><YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#ec4899" fill="url(#spaHourlyGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Daily Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" /><YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Booking Status Distribution</CardTitle></CardHeader>
              <CardContent>
                {statusData.length === 0 ? (<div className="flex items-center justify-center h-[300px] text-muted-foreground">No booking data</div>) : (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>{statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4">{statusData.map((entry) => (<div key={entry.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-sm">{entry.name} ({entry.value})</span></div>))}</div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Payment Mode Distribution</CardTitle></CardHeader>
              <CardContent>
                {paymentModeData.length === 0 ? (<div className="flex items-center justify-center h-[300px] text-muted-foreground">No payment data</div>) : (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart><Pie data={paymentModeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>{paymentModeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4">{paymentModeData.map((entry) => (<div key={entry.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-sm">{entry.name} ({entry.value})</span></div>))}</div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg"><p className="text-2xl font-bold">{filteredBookings.length}</p><p className="text-sm text-muted-foreground">Total Bookings</p></div>
                <div className="text-center p-4 bg-muted/30 rounded-lg"><p className="text-2xl font-bold">{paidBookings.length}</p><p className="text-sm text-muted-foreground">Paid Bookings</p></div>
                <div className="text-center p-4 bg-muted/30 rounded-lg"><p className="text-2xl font-bold">{filteredBookings.filter(b => b.payment_status === 'pending').length}</p><p className="text-sm text-muted-foreground">Pending Payment</p></div>
                <div className="text-center p-4 bg-muted/30 rounded-lg"><p className="text-2xl font-bold">{currencySymbol}{paidBookings.length > 0 ? (totalRevenue / paidBookings.length).toFixed(0) : 0}</p><p className="text-sm text-muted-foreground">Avg. Booking Value</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Service Revenue Breakdown</CardTitle></CardHeader>
              <CardContent>
                {serviceRevenue.length === 0 ? (<div className="flex items-center justify-center h-[300px] text-muted-foreground">No service data</div>) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={serviceRevenue.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" /><YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" width={120} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>{serviceRevenue.slice(0, 10).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Services by Category</CardTitle></CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (<div className="flex items-center justify-center h-[300px] text-muted-foreground">No services</div>) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart><Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Top Performing Services</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Service</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Bookings</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Avg. Value</TableHead></TableRow></TableHeader>
                <TableBody>
                  {serviceRevenue.map((service) => (<TableRow key={service.name}><TableCell className="font-medium">{service.name}</TableCell><TableCell className="capitalize">{service.category.replace('_', ' ')}</TableCell><TableCell className="text-right">{service.count}</TableCell><TableCell className="text-right">{currencySymbol}{service.revenue.toFixed(2)}</TableCell><TableCell className="text-right">{currencySymbol}{service.count > 0 ? (service.revenue / service.count).toFixed(2) : '0.00'}</TableCell></TableRow>))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-pink-500/20"><Package className="h-5 w-5 text-pink-500" /></div><div><p className="text-sm text-muted-foreground">Total Items</p><p className="text-2xl font-bold">{inventory.length}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/20"><DollarSign className="h-5 w-5 text-emerald-500" /></div><div><p className="text-sm text-muted-foreground">Stock Value</p><p className="text-2xl font-bold text-emerald-500">{currencySymbol}{totalStockValue.toFixed(0)}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/20"><TrendingDown className="h-5 w-5 text-amber-500" /></div><div><p className="text-sm text-muted-foreground">Stock Cost</p><p className="text-2xl font-bold text-amber-500">{currencySymbol}{totalStockCost.toFixed(0)}</p></div></div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Inventory Status</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Min Level</TableHead><TableHead className="text-right">Cost Price</TableHead><TableHead className="text-right">Stock Value</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {inventory.map((item) => {
                    const stockValue = Number(item.cost_price) * Number(item.current_stock);
                    const isLow = item.current_stock <= item.min_stock_level;
                    return (<TableRow key={item.id}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="capitalize">{item.category}</TableCell><TableCell className="text-right">{item.current_stock} {item.unit}</TableCell><TableCell className="text-right">{item.min_stock_level}</TableCell><TableCell className="text-right">{currencySymbol}{item.cost_price}</TableCell><TableCell className="text-right">{currencySymbol}{stockValue.toFixed(2)}</TableCell><TableCell><span className={`px-2 py-1 rounded-full text-xs ${isLow ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{isLow ? 'Low Stock' : 'In Stock'}</span></TableCell></TableRow>);
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
