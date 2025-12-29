import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useHousekeepingTasks, useHousekeepingInventory } from '@/hooks/useDepartmentData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, getHours, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Package, CheckCircle, Clock, FileText, Download, CalendarIcon, Users, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  in_progress: '#3b82f6',
  pending: '#f59e0b',
  cancelled: '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  normal: '#3b82f6',
  low: '#10b981',
};

const TASK_TYPE_COLORS: Record<string, string> = {
  cleaning: '#3b82f6',
  turndown: '#8b5cf6',
  maintenance: '#f59e0b',
  deep_cleaning: '#06b6d4',
  inspection: '#10b981',
  default: '#6b7280',
};

export default function HousekeepingReports() {
  const { data: tasks = [] } = useHousekeepingTasks('all');
  const { data: inventory = [] } = useHousekeepingInventory();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'custom'>('today');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const getFilteredTasks = () => {
    const now = new Date();
    let filterStart = startOfDay(now);
    let filterEnd = endOfDay(now);
    
    if (dateRange === '7days') filterStart = startOfDay(subDays(now, 7));
    else if (dateRange === '30days') filterStart = startOfDay(subDays(now, 30));
    else if (dateRange === 'custom') {
      filterStart = startOfDay(startDate);
      filterEnd = endOfDay(endDate);
    }
    
    return tasks.filter(t => {
      const taskDate = t.scheduled_date ? parseISO(t.scheduled_date) : new Date(t.created_at);
      return isWithinInterval(taskDate, { start: filterStart, end: filterEnd });
    });
  };

  const filteredTasks = getFilteredTasks();
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');
  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');

  const completionRate = filteredTasks.length > 0 ? Math.round((completedTasks.length / filteredTasks.length) * 100) : 0;

  const getDayCount = () => {
    if (dateRange === 'today') return 1;
    if (dateRange === '7days') return 7;
    if (dateRange === '30days') return 30;
    return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  const dailyTasks = Array.from({ length: getDayCount() }, (_, i) => {
    const date = dateRange === 'custom' ? new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000) : subDays(new Date(), getDayCount() - 1 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTasks = tasks.filter(t => t.scheduled_date === dateStr || t.created_at.startsWith(dateStr));
    return {
      date: format(date, 'dd MMM'),
      completed: dayTasks.filter(t => t.status === 'completed').length,
      pending: dayTasks.filter(t => t.status === 'pending').length,
      inProgress: dayTasks.filter(t => t.status === 'in_progress').length,
      total: dayTasks.length,
    };
  });

  const hourlyTasks = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayTasks = tasks.filter(t => t.scheduled_date === today || t.created_at.startsWith(today));
    
    return Array.from({ length: 24 }, (_, hour) => {
      const hourTasks = todayTasks.filter(t => {
        const createdHour = getHours(new Date(t.created_at));
        return createdHour === hour;
      });
      return { hour: `${hour.toString().padStart(2, '0')}:00`, tasks: hourTasks.length, completed: hourTasks.filter(t => t.status === 'completed').length };
    }).filter(h => h.tasks > 0);
  }, [tasks]);

  const statusData = [
    { name: 'Completed', value: completedTasks.length, color: STATUS_COLORS.completed },
    { name: 'In Progress', value: inProgressTasks.length, color: STATUS_COLORS.in_progress },
    { name: 'Pending', value: pendingTasks.length, color: STATUS_COLORS.pending },
  ].filter(d => d.value > 0);

  const priorityData = [
    { name: 'High', value: filteredTasks.filter(t => t.priority === 'high').length, color: PRIORITY_COLORS.high },
    { name: 'Normal', value: filteredTasks.filter(t => t.priority === 'normal').length, color: PRIORITY_COLORS.normal },
    { name: 'Low', value: filteredTasks.filter(t => t.priority === 'low').length, color: PRIORITY_COLORS.low },
  ].filter(d => d.value > 0);

  const taskTypeData = useMemo(() => {
    const typeMap = new Map<string, number>();
    filteredTasks.forEach(t => {
      const type = t.task_type || 'other';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });
    return Array.from(typeMap.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
      value,
      color: TASK_TYPE_COLORS[name.toLowerCase()] || TASK_TYPE_COLORS.default,
    })).sort((a, b) => b.value - a.value);
  }, [filteredTasks]);

  const staffPerformance = useMemo(() => {
    const staffMap = new Map<string, { name: string; completed: number; total: number }>();
    filteredTasks.forEach(t => {
      const staffName = t.assigned_name || 'Unassigned';
      const existing = staffMap.get(staffName) || { name: staffName, completed: 0, total: 0 };
      existing.total += 1;
      if (t.status === 'completed') existing.completed += 1;
      staffMap.set(staffName, existing);
    });
    return Array.from(staffMap.values()).sort((a, b) => b.completed - a.completed);
  }, [filteredTasks]);

  const totalStockValue = inventory.reduce((sum, i) => sum + (Number(i.cost_price) * Number(i.current_stock)), 0);
  const lowStockItems = inventory.filter(i => i.current_stock <= i.min_stock_level);

  const exportToPDF = (reportType: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.text(settings?.hotel_name || 'Housekeeping', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${reportType} Report`, pageWidth / 2, 30, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Date Range: ${getDateRangeText()}`, pageWidth / 2, 38, { align: 'center' });

    let tableData: string[][] = [];
    let headers: string[] = [];

    if (reportType === 'Tasks') {
      headers = ['Task #', 'Type', 'Priority', 'Status', 'Assigned To', 'Date'];
      tableData = filteredTasks.map(t => [t.task_number || '', t.task_type, t.priority || 'normal', t.status || 'pending', t.assigned_name || 'Unassigned', t.scheduled_date || format(new Date(t.created_at), 'yyyy-MM-dd')]);
    } else if (reportType === 'Staff') {
      headers = ['Staff Name', 'Completed', 'Total', 'Completion Rate'];
      tableData = staffPerformance.map(s => [s.name, s.completed.toString(), s.total.toString(), `${s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0}%`]);
    } else if (reportType === 'Stock') {
      headers = ['Item', 'Category', 'Stock', 'Min Level', 'Cost', 'Status'];
      tableData = inventory.map(i => [i.name, i.category || '', `${i.current_stock} ${i.unit}`, i.min_stock_level.toString(), `${currencySymbol}${i.cost_price}`, i.current_stock <= i.min_stock_level ? 'Low' : 'OK']);
    }

    autoTable(doc, { head: [headers], body: tableData, startY: 50, styles: { fontSize: 9 }, headStyles: { fillColor: [6, 182, 212] } });
    doc.save(`housekeeping_${reportType.toLowerCase()}_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const exportToExcel = (reportType: string) => {
    let data: Record<string, unknown>[] = [];

    if (reportType === 'Tasks') {
      data = filteredTasks.map(t => ({ 'Task #': t.task_number, 'Type': t.task_type, 'Priority': t.priority, 'Status': t.status, 'Assigned To': t.assigned_name || 'Unassigned', 'Date': t.scheduled_date }));
    } else if (reportType === 'Staff') {
      data = staffPerformance.map(s => ({ 'Staff Name': s.name, 'Completed': s.completed, 'Total': s.total, 'Completion Rate': `${s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0}%` }));
    } else if (reportType === 'Stock') {
      data = inventory.map(i => ({ 'Item': i.name, 'Category': i.category, 'Stock': i.current_stock, 'Unit': i.unit, 'Min Level': i.min_stock_level, 'Cost Price': i.cost_price, 'Status': i.current_stock <= i.min_stock_level ? 'Low Stock' : 'In Stock' }));
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportType);
    XLSX.writeFile(wb, `housekeeping_${reportType.toLowerCase()}_report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const getDateRangeText = () => {
    if (dateRange === 'today') return format(new Date(), 'dd MMM yyyy');
    if (dateRange === '7days') return `${format(subDays(new Date(), 7), 'dd MMM')} - ${format(new Date(), 'dd MMM yyyy')}`;
    if (dateRange === '30days') return `${format(subDays(new Date(), 30), 'dd MMM')} - ${format(new Date(), 'dd MMM yyyy')}`;
    return `${format(startDate, 'dd MMM yyyy')} - ${format(endDate, 'dd MMM yyyy')}`;
  };

  return (
    <DashboardLayout title="Housekeeping Reports" subtitle="Task analytics and performance reports">
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
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToPDF('Tasks')}>Tasks Report</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToPDF('Staff')}>Staff Report</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToPDF('Stock')}>Stock Report</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Export Excel</Button></PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="grid gap-1">
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToExcel('Tasks')}>Tasks Report</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToExcel('Staff')}>Staff Report</Button>
                <Button variant="ghost" size="sm" className="justify-start" onClick={() => exportToExcel('Stock')}>Stock Report</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hourly">Hourly Trend</TabsTrigger>
          <TabsTrigger value="tasks">Task Analysis</TabsTrigger>
          <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          <TabsTrigger value="stock">Stock Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-cyan-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20"><FileText className="h-5 w-5 text-cyan-500" /></div>
                  <div><p className="text-sm text-muted-foreground">Total Tasks</p><p className="text-2xl font-bold">{filteredTasks.length}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20"><CheckCircle className="h-5 w-5 text-emerald-500" /></div>
                  <div><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold text-emerald-500">{completedTasks.length}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20"><Clock className="h-5 w-5 text-amber-500" /></div>
                  <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-amber-500">{pendingTasks.length}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className={completionRate >= 70 ? "border-emerald-500/30" : completionRate >= 50 ? "border-amber-500/30" : "border-red-500/30"}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${completionRate >= 70 ? 'bg-emerald-500/20' : completionRate >= 50 ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
                    <TrendingUp className={`h-5 w-5 ${completionRate >= 70 ? 'text-emerald-500' : completionRate >= 50 ? 'text-amber-500' : 'text-red-500'}`} />
                  </div>
                  <div><p className="text-sm text-muted-foreground">Completion Rate</p><p className={`text-2xl font-bold ${completionRate >= 70 ? 'text-emerald-500' : completionRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{completionRate}%</p></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Daily Task Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyTasks}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" /><YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="inProgress" stackId="a" fill="#3b82f6" name="In Progress" />
                    <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
              <CardContent>
                {statusData.length === 0 ? (<div className="flex items-center justify-center h-[300px] text-muted-foreground">No tasks</div>) : (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>{statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4">{statusData.map((entry) => (<div key={entry.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-sm">{entry.name} ({entry.value})</span></div>))}</div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hourly" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Hourly Task Creation (Today)</CardTitle></CardHeader>
            <CardContent>
              {hourlyTasks.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">No tasks created today</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={hourlyTasks}>
                    <defs>
                      <linearGradient id="housekeepingHourlyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" /><YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="tasks" stroke="#06b6d4" fill="url(#housekeepingHourlyGradient)" strokeWidth={2} name="Tasks Created" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Tasks by Type</CardTitle></CardHeader>
              <CardContent>
                {taskTypeData.length === 0 ? (<div className="flex items-center justify-center h-[300px] text-muted-foreground">No task data</div>) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={taskTypeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" /><YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>{taskTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Tasks by Priority</CardTitle></CardHeader>
              <CardContent>
                {priorityData.length === 0 ? (<div className="flex items-center justify-center h-[300px] text-muted-foreground">No priority data</div>) : (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart><Pie data={priorityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>{priorityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4">{priorityData.map((entry) => (<div key={entry.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-sm">{entry.name} ({entry.value})</span></div>))}</div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Staff Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Staff Name</TableHead><TableHead className="text-right">Completed</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Completion Rate</TableHead><TableHead>Performance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {staffPerformance.map((staff) => {
                    const rate = staff.total > 0 ? Math.round((staff.completed / staff.total) * 100) : 0;
                    return (<TableRow key={staff.name}><TableCell className="font-medium">{staff.name}</TableCell><TableCell className="text-right">{staff.completed}</TableCell><TableCell className="text-right">{staff.total}</TableCell><TableCell className="text-right">{rate}%</TableCell><TableCell><span className={`px-2 py-1 rounded-full text-xs ${rate >= 80 ? 'bg-emerald-500/20 text-emerald-500' : rate >= 50 ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'}`}>{rate >= 80 ? 'Excellent' : rate >= 50 ? 'Good' : 'Needs Improvement'}</span></TableCell></TableRow>);
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Staff Workload Distribution</CardTitle></CardHeader>
            <CardContent>
              {staffPerformance.length === 0 ? (<div className="flex items-center justify-center h-[300px] text-muted-foreground">No staff data</div>) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={staffPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" /><YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" width={100} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-cyan-500/20"><Package className="h-5 w-5 text-cyan-500" /></div><div><p className="text-sm text-muted-foreground">Total Items</p><p className="text-2xl font-bold">{inventory.length}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/20"><DollarSign className="h-5 w-5 text-emerald-500" /></div><div><p className="text-sm text-muted-foreground">Stock Value</p><p className="text-2xl font-bold text-emerald-500">{currencySymbol}{totalStockValue.toFixed(0)}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-500/20"><AlertTriangle className="h-5 w-5 text-red-500" /></div><div><p className="text-sm text-muted-foreground">Low Stock Items</p><p className="text-2xl font-bold text-red-500">{lowStockItems.length}</p></div></div></CardContent></Card>
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
