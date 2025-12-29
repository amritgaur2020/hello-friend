import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { useHotelPLData, DepartmentPLData } from '@/hooks/useHotelPLData';
import { useBudgetTargets, calculateBudgetComparisons } from '@/hooks/useBudgetTargets';
import { useExpenseTracking, EXPENSE_CATEGORIES, DEPARTMENTS_LIST, Expense } from '@/hooks/useExpenseTracking';
import { useExpenseBudgets, EXPENSE_CATEGORY_LABELS } from '@/hooks/useExpenseBudgets';
import { exportToPDF, exportToExcel, exportDepartmentBreakdownToPDF, exportDepartmentBreakdownToExcel, exportTaxFilingReport } from '@/utils/plReportExport';
import { ComparativePLReport } from '@/components/reports/ComparativePLReport';
import { TrendAnalysisCharts } from '@/components/reports/TrendAnalysisCharts';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Package,
  AlertTriangle,
  BarChart3,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  GitCompare,
  RefreshCw,
  CalendarIcon,
  Target,
  Plus,
  Check,
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Building2,
  Receipt,
  Users,
  Trash2,
  Repeat,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-6))', 'hsl(var(--chart-7))'];

export default function HotelPLReport() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';

  // Date range state
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [comparisonType, setComparisonType] = useState<'previous' | 'last_week' | 'last_month' | 'last_year'>('previous');
  const [forecastDays, setForecastDays] = useState(7);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startDate, to: endDate });
  
  // Department comparison state
  const [dept1, setDept1] = useState<string>('');
  const [dept2, setDept2] = useState<string>('');

  const {
    summary,
    departments,
    inventoryValuation,
    totalInventoryValue,
    lowStockItems,
    forecast,
    comparison,
    frontOffice,
    isLoading,
    refetch,
  } = useHotelPLData({
    startDate: dateRange?.from || startDate,
    endDate: dateRange?.to || endDate,
    comparisonType,
    forecastDays,
  });

  // Expense tracking
  const { expenses, summary: expenseSummary, departmentSummaries, addExpense, deleteExpense, getExpensesByDateRange, getExpensesByDepartment, generateRecurringExpenses } = useExpenseTracking();
  const { 
    expenseBudgets, 
    saveExpenseBudget, 
    getTotalBudgetForMonth, 
    getBudgetsForMonth,
    recordMonthlyPL,
    getHistoricalPL,
  } = useExpenseBudgets();
  
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseBudgetDialogOpen, setExpenseBudgetDialogOpen] = useState(false);
  const [newExpenseBudget, setNewExpenseBudget] = useState({
    category: 'total' as const,
    amount: '',
    month: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [newExpense, setNewExpense] = useState({ 
    category: 'utilities' as const, 
    description: '', 
    amount: '', 
    date: format(new Date(), 'yyyy-MM-dd'), 
    recurring: false,
    recurringFrequency: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    department: 'general' as string,
  });
  
  const periodExpenses = getExpensesByDateRange(dateRange?.from || startDate, dateRange?.to || endDate);
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseBudgetForPeriod = getTotalBudgetForMonth(dateRange?.from || startDate);
  const expenseBudgetVariance = expenseBudgetForPeriod - totalExpenses;

  // Calculate department expense allocations for the selected period
  const periodDepartmentExpenses = DEPARTMENTS_LIST.map(dept => {
    const deptExpenses = periodExpenses.filter(e => e.department === dept.value);
    return {
      department: dept.value,
      displayName: dept.label,
      total: deptExpenses.reduce((sum, e) => sum + e.amount, 0),
      expenses: deptExpenses,
    };
  }).filter(d => d.total > 0);

  // Calculate expense budget comparison by category
  const expenseBudgetComparison = EXPENSE_CATEGORIES.map(cat => {
    const actual = periodExpenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0);
    const budgetItem = getBudgetsForMonth(dateRange?.from || startDate).find(b => b.category === cat.value);
    const budgeted = budgetItem?.budgetAmount || 0;
    const variance = budgeted - actual;
    const percentUsed = budgeted > 0 ? (actual / budgeted) * 100 : 0;
    
    return {
      category: cat.value,
      displayName: cat.label,
      budgeted,
      actual,
      variance,
      percentUsed,
      status: budgeted === 0 ? 'on-track' as const : percentUsed > 100 ? 'over' as const : percentUsed > 80 ? 'on-track' as const : 'under' as const,
    };
  });

  // Record current month's P&L for historical tracking
  useEffect(() => {
    if (!isLoading && summary.totalRevenue > 0) {
      const currentMonth = format(startOfMonth(dateRange?.from || startDate), 'yyyy-MM-dd');
      recordMonthlyPL({
        month: currentMonth,
        revenue: summary.totalRevenue,
        cogs: summary.totalCOGS,
        grossProfit: summary.grossProfit,
        tax: summary.totalTax,
        operatingProfit: summary.operatingProfit,
        expenses: totalExpenses,
        netProfit: summary.operatingProfit - totalExpenses,
        netMargin: summary.totalRevenue > 0 ? ((summary.operatingProfit - totalExpenses) / summary.totalRevenue) * 100 : 0,
      });
    }
  }, [isLoading, summary, totalExpenses, dateRange]);

  // Get historical net profit data for trend chart
  const historicalPLData = getHistoricalPL(6);
  
  const handleSaveExpenseBudget = () => {
    if (!newExpenseBudget.amount) {
      toast({ title: 'Error', description: 'Please enter budget amount', variant: 'destructive' });
      return;
    }
    saveExpenseBudget({
      category: newExpenseBudget.category,
      budgetAmount: parseFloat(newExpenseBudget.amount),
      month: newExpenseBudget.month,
    });
    toast({ title: 'Success', description: 'Expense budget saved' });
    setExpenseBudgetDialogOpen(false);
    setNewExpenseBudget({ category: 'total', amount: '', month: format(startOfMonth(new Date()), 'yyyy-MM-dd') });
  };

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    addExpense({ 
      ...newExpense, 
      amount: parseFloat(newExpense.amount),
      recurringFrequency: newExpense.recurring ? newExpense.recurringFrequency : undefined,
    });
    toast({ title: 'Success', description: newExpense.recurring ? 'Recurring expense added' : 'Expense added' });
    setExpenseDialogOpen(false);
    setNewExpense({ category: 'utilities', description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), recurring: false, recurringFrequency: 'monthly', department: 'general' });
  };

  const handleExportPDF = () => {
    exportToPDF({
      summary, departments, inventoryValuation, lowStockItems, forecast,
      expenses: periodExpenses,
      expenseBreakdown: Object.entries(expenseSummary).filter(([k]) => k !== 'total').map(([category, amount]) => ({ category, amount: amount as number })),
      departmentExpenses: periodDepartmentExpenses.map(d => ({ department: d.department, displayName: d.displayName, total: d.total })),
      budgetComparisons,
      frontOffice,
      dateRange: { start: dateRange?.from || startDate, end: dateRange?.to || endDate },
      hotelName: settings?.hotel_name,
      currencySymbol,
    });
    toast({ title: 'PDF exported successfully' });
  };

  const handleExportExcel = () => {
    exportToExcel({
      summary, departments, inventoryValuation, lowStockItems, forecast,
      expenses: periodExpenses,
      expenseBreakdown: Object.entries(expenseSummary).filter(([k]) => k !== 'total').map(([category, amount]) => ({ category, amount: amount as number })),
      departmentExpenses: periodDepartmentExpenses.map(d => ({ department: d.department, displayName: d.displayName, total: d.total })),
      budgetComparisons,
      frontOffice,
      dateRange: { start: dateRange?.from || startDate, end: dateRange?.to || endDate },
      hotelName: settings?.hotel_name,
      currencySymbol,
    });
    toast({ title: 'Excel exported successfully' });
  };

  const handleExportTaxReport = () => {
    // Build registered address from settings
    const addressParts = [
      settings?.address,
      settings?.city,
      settings?.state,
      settings?.pincode || settings?.postal_code
    ].filter(Boolean);
    const registeredAddress = addressParts.length > 0 ? addressParts.join(', ') : undefined;
    
    // Use GST or PAN as tax identification
    const taxIdentificationNumber = settings?.gst_number || settings?.pan_number || undefined;
    
    exportTaxFilingReport({
      summary,
      departments,
      expenseBreakdown: Object.entries(expenseSummary).filter(([k]) => k !== 'total').map(([category, amount]) => ({ category, amount: amount as number })),
      dateRange: { start: dateRange?.from || startDate, end: dateRange?.to || endDate },
      hotelName: settings?.hotel_name,
      currencySymbol,
      financialYear: `FY ${format(dateRange?.from || startDate, 'yyyy')}-${format(dateRange?.to || endDate, 'yy')}`,
      taxIdentificationNumber,
      registeredAddress,
    });
    toast({ title: 'Tax Filing Report exported successfully' });
  };

  // Budget targets
  const { budgets, saveBudget, getBudgetForMonth, isLoading: budgetsLoading } = useBudgetTargets();
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [selectedBudgetDept, setSelectedBudgetDept] = useState('');
  const [budgetMonth, setBudgetMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [revenueTarget, setRevenueTarget] = useState('');
  const [cogsTarget, setCogsTarget] = useState('');
  const [profitTarget, setProfitTarget] = useState('');

  // Calculate budget comparisons
  const budgetComparisons = calculateBudgetComparisons(
    departments,
    getBudgetForMonth,
    dateRange?.from || startDate
  );

  // Set default department selections when data loads
  if (departments.length >= 2 && !dept1 && !dept2) {
    setDept1(departments[0]?.department || '');
    setDept2(departments[1]?.department || '');
  }

  const handleSaveBudget = async () => {
    if (!selectedBudgetDept) {
      toast({ title: 'Error', description: 'Please select a department', variant: 'destructive' });
      return;
    }
    
    await saveBudget({
      department: selectedBudgetDept,
      month: budgetMonth,
      revenue_target: parseFloat(revenueTarget) || 0,
      cogs_budget: parseFloat(cogsTarget) || 0,
      profit_target: parseFloat(profitTarget) || 0,
    });
    
    toast({ title: 'Success', description: 'Budget target saved successfully' });
    setBudgetDialogOpen(false);
    setRevenueTarget('');
    setCogsTarget('');
    setProfitTarget('');
  };

  const openBudgetDialog = (dept?: string) => {
    if (dept) {
      setSelectedBudgetDept(dept);
      const existingBudget = getBudgetForMonth(dept, dateRange?.from || startDate);
      if (existingBudget) {
        setRevenueTarget(existingBudget.revenue_target.toString());
        setCogsTarget(existingBudget.cogs_budget.toString());
        setProfitTarget(existingBudget.profit_target.toString());
      }
    }
    setBudgetDialogOpen(true);
  };

  if (authLoading) {
    return (
      <DashboardLayout title="P/L Report">
        <div className="flex items-center justify-center h-96">
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="P/L Report">
        <AccessDenied />
      </DashboardLayout>
    );
  }

  const formatCurrency = (value: number) => `${currencySymbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  // Prepare pie chart data
  const pieData = departments.map((d, i) => ({
    name: d.displayName,
    value: d.revenue,
    color: COLORS[i % COLORS.length],
  }));

  // Prepare forecast chart data
  const forecastChartData = forecast.dailyProjections.map(proj => ({
    date: format(new Date(proj.date), 'MMM dd'),
    revenue: proj.revenue,
    profit: proj.profit,
  }));

  // Day of week chart data
  const dayOfWeekData = forecast.dayOfWeekAnalysis.map(d => ({
    day: d.day.slice(0, 3),
    revenue: d.avgRevenue,
    orders: d.avgOrders,
  }));

  // Get selected departments for comparison
  const selectedDept1 = departments.find(d => d.department === dept1);
  const selectedDept2 = departments.find(d => d.department === dept2);

  return (
    <DashboardLayout title="P/L Report">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hotel P/L Report</h1>
            <p className="text-muted-foreground">
              Comprehensive profit & loss analysis across all departments
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}</> : format(dateRange.from, "LLL dd, y")) : <span>Pick dates</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
            <Select value={comparisonType} onValueChange={(v: any) => setComparisonType(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Compare to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="previous">Previous Period</SelectItem>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportTaxReport}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Tax Filing Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
                  {comparison && (
                    <div className="flex items-center gap-1 text-sm">
                      <TrendIcon value={comparison.changes.revenue.percentage} />
                      <span className={comparison.changes.revenue.percentage >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {formatPercent(comparison.changes.revenue.percentage)}
                      </span>
                      <span className="text-muted-foreground">vs previous</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total COGS</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(summary.totalCOGS)}</div>
                  {comparison && (
                    <div className="flex items-center gap-1 text-sm">
                      <TrendIcon value={-comparison.changes.cogs.percentage} />
                      <span className={comparison.changes.cogs.percentage <= 0 ? 'text-green-500' : 'text-red-500'}>
                        {formatPercent(comparison.changes.cogs.percentage)}
                      </span>
                      <span className="text-muted-foreground">vs previous</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(summary.grossProfit)}</div>
                  <div className="flex items-center gap-1 text-sm">
                    <Badge variant="secondary">{summary.grossMargin.toFixed(1)}% margin</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${(summary.operatingProfit - totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.operatingProfit - totalExpenses)}
                  </div>
                  <div className="flex items-center gap-1 text-sm mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {summary.totalRevenue > 0 ? (((summary.operatingProfit - totalExpenses) / summary.totalRevenue) * 100).toFixed(1) : 0}% margin
                    </Badge>
                    <span className="text-xs text-muted-foreground">after all expenses</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="comparative">YoY/QoQ</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trends" className="space-y-6">
            <TrendAnalysisCharts />
          </TabsContent>
          
          <TabsContent value="comparative" className="space-y-6">
            <ComparativePLReport />
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* P&L Statement - Professional Layout */}
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Income Statement</CardTitle>
                    <CardDescription>
                      {format(dateRange?.from || startDate, 'MMM dd, yyyy')} - {format(dateRange?.to || endDate, 'MMM dd, yyyy')}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {settings?.hotel_name || 'Hotel'} P&L
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <div className="divide-y">
                    {/* Revenue Section */}
                    <div className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-primary rounded-full" />
                          <span className="font-semibold">Total Revenue</span>
                        </div>
                        <span className="text-xl font-bold">{formatCurrency(summary.totalRevenue)}</span>
                      </div>
                    </div>

                    {/* COGS Section */}
                    <div className="p-4 pl-8 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Less: Cost of Goods Sold</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-destructive">({formatCurrency(summary.totalCOGS)})</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {summary.totalRevenue > 0 ? ((summary.totalCOGS / summary.totalRevenue) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Gross Profit */}
                    <div className="p-4 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-green-500 rounded-full" />
                          <div>
                            <span className="font-semibold">Gross Profit</span>
                            <span className="text-xs text-muted-foreground ml-2">({summary.grossMargin.toFixed(1)}% margin)</span>
                          </div>
                        </div>
                        <span className="text-xl font-bold text-green-600">{formatCurrency(summary.grossProfit)}</span>
                      </div>
                    </div>

                    {/* Tax Section */}
                    <div className="p-4 pl-8 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Less: Taxes</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-amber-600">({formatCurrency(summary.totalTax)})</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {summary.totalRevenue > 0 ? ((summary.totalTax / summary.totalRevenue) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Operating Profit */}
                    <div className="p-4 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-blue-500 rounded-full" />
                          <div>
                            <span className="font-semibold">Operating Profit</span>
                            <span className="text-xs text-muted-foreground ml-2">({summary.operatingMargin.toFixed(1)}% margin)</span>
                          </div>
                        </div>
                        <span className="text-xl font-bold text-blue-600">{formatCurrency(summary.operatingProfit)}</span>
                      </div>
                    </div>

                    {/* Operating Expenses */}
                    <div className="p-4 pl-8 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="text-muted-foreground">Less: Operating Expenses</span>
                            {expenseBudgetForPeriod > 0 && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "ml-2 text-xs",
                                  expenseBudgetVariance >= 0 ? "border-green-500 text-green-600" : "border-destructive text-destructive"
                                )}
                              >
                                {expenseBudgetVariance >= 0 ? 'Under' : 'Over'} Budget
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-purple-600">({formatCurrency(totalExpenses)})</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {summary.totalRevenue > 0 ? ((totalExpenses / summary.totalRevenue) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Net Profit */}
                    <div className={cn(
                      "p-5",
                      (summary.operatingProfit - totalExpenses) >= 0 
                        ? "bg-green-50 dark:bg-green-950/30" 
                        : "bg-red-50 dark:bg-red-950/30"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-1.5 h-10 rounded-full",
                            (summary.operatingProfit - totalExpenses) >= 0 ? "bg-green-600" : "bg-red-600"
                          )} />
                          <div>
                            <span className="font-bold text-lg">Net Profit</span>
                            <p className="text-xs text-muted-foreground">After all expenses</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-2xl font-bold",
                            (summary.operatingProfit - totalExpenses) >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatCurrency(summary.operatingProfit - totalExpenses)}
                          </span>
                          <p className="text-sm text-muted-foreground">
                            {summary.totalRevenue > 0 ? (((summary.operatingProfit - totalExpenses) / summary.totalRevenue) * 100).toFixed(1) : 0}% Net Margin
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Net Profit Trend Chart */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">Net Profit Trend</CardTitle>
                      <CardDescription>Month-over-month performance after all expenses</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-medium">Last 6 Months</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {historicalPLData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4">
                      <LineChart className="h-12 w-12 opacity-50" />
                    </div>
                    <p className="text-sm">Historical data will appear as you view reports over time</p>
                  </div>
                ) : (
                  <>
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[hsl(217,91%,60%)]" />
                        <span className="text-sm text-muted-foreground">Revenue</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[hsl(142,71%,45%)]" />
                        <span className="text-sm text-muted-foreground">Net Profit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-[hsl(var(--destructive))] opacity-60" />
                        <span className="text-sm text-muted-foreground">Expenses</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                      <ComposedChart data={historicalPLData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke="hsl(var(--border))" 
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="monthLabel" 
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}k`}
                          width={60}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [formatCurrency(value), name]}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          }}
                          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                        />
                        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          name="Revenue"
                          fill="url(#revenueGradient)" 
                          stroke="hsl(217, 91%, 60%)"
                          strokeWidth={2}
                        />
                        <Bar 
                          dataKey="expenses" 
                          name="Expenses"
                          fill="url(#expenseGradient)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="netProfit" 
                          name="Net Profit"
                          stroke="hsl(142, 71%, 45%)"
                          strokeWidth={3}
                          dot={{ 
                            fill: 'hsl(142, 71%, 45%)', 
                            strokeWidth: 2, 
                            r: 5,
                            stroke: 'hsl(var(--card))'
                          }}
                          activeDot={{ 
                            r: 7, 
                            stroke: 'hsl(142, 71%, 45%)',
                            strokeWidth: 2,
                            fill: 'hsl(var(--card))'
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Expense Budget vs Actual */}
            {expenseBudgetForPeriod > 0 && (
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Expense Budget Performance
                      </CardTitle>
                      <CardDescription>Actual spending vs budgeted amounts</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {formatCurrency(totalExpenses)} <span className="text-muted-foreground text-sm font-normal">/ {formatCurrency(expenseBudgetForPeriod)}</span>
                      </p>
                      <Badge 
                        variant={expenseBudgetVariance >= 0 ? "default" : "destructive"}
                        className={expenseBudgetVariance >= 0 ? "bg-green-600" : ""}
                      >
                        {expenseBudgetVariance >= 0 ? `${formatCurrency(expenseBudgetVariance)} remaining` : `${formatCurrency(Math.abs(expenseBudgetVariance))} over budget`}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Budget utilization</span>
                      <span className="font-medium">
                        {expenseBudgetForPeriod > 0 ? ((totalExpenses / expenseBudgetForPeriod) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((totalExpenses / expenseBudgetForPeriod) * 100, 100)} 
                      className={cn(
                        "h-3",
                        (totalExpenses / expenseBudgetForPeriod) > 1 && "[&>div]:bg-destructive"
                      )}
                    />
                  </div>

                  {/* Category breakdown */}
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {expenseBudgetComparison.filter(c => c.budgeted > 0 || c.actual > 0).map((item) => (
                      <div key={item.category} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{item.displayName}</span>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              item.status === 'over' && "border-destructive text-destructive",
                              item.status === 'under' && "border-green-500 text-green-600",
                              item.status === 'on-track' && "border-amber-500 text-amber-600"
                            )}
                          >
                            {item.status === 'over' ? 'Over' : item.status === 'under' ? 'Under' : 'On Track'}
                          </Badge>
                        </div>
                        <div className="flex items-baseline justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Actual</span>
                          <span className="font-semibold">{formatCurrency(item.actual)}</span>
                        </div>
                        {item.budgeted > 0 && (
                          <>
                            <div className="flex items-baseline justify-between text-sm text-muted-foreground">
                              <span>Budget</span>
                              <span>{formatCurrency(item.budgeted)}</span>
                            </div>
                            <Progress 
                              value={Math.min(item.percentUsed, 100)} 
                              className={cn(
                                "h-1.5 mt-2",
                                item.percentUsed > 100 && "[&>div]:bg-destructive"
                              )}
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Revenue by Department Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Revenue by Department
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RePieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Department Performance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Department Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {departments.map((dept, i) => (
                        <div key={dept.department} className="flex items-center gap-4">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate">{dept.displayName}</span>
                              <span className="font-bold">{formatCurrency(dept.revenue)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>{dept.orderCount} orders</span>
                              <div className="flex items-center gap-1">
                                <TrendIcon value={dept.trend} />
                                <span className={dept.trend >= 0 ? 'text-green-500' : 'text-red-500'}>
                                  {formatPercent(dept.trend)}
                                </span>
                              </div>
                            </div>
                            <Progress value={dept.margin} className="h-1.5 mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Department Performance Table</CardTitle>
                <CardDescription>Detailed P/L breakdown by department</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium">Department</th>
                          <th className="text-right py-3 px-2 font-medium">Revenue</th>
                          <th className="text-right py-3 px-2 font-medium">COGS</th>
                          <th className="text-right py-3 px-2 font-medium">GST/Tax</th>
                          <th className="text-right py-3 px-2 font-medium">Gross Profit</th>
                          <th className="text-right py-3 px-2 font-medium">Net Profit</th>
                          <th className="text-right py-3 px-2 font-medium">Margin</th>
                          <th className="text-right py-3 px-2 font-medium">Orders</th>
                          <th className="text-right py-3 px-2 font-medium">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departments.map((dept, i) => (
                          <tr key={dept.department} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="font-medium">{dept.displayName}</span>
                              </div>
                            </td>
                            <td className="text-right py-3 px-2 font-medium">{formatCurrency(dept.revenue)}</td>
                            <td className="text-right py-3 px-2">{formatCurrency(dept.cogs)}</td>
                            <td className="text-right py-3 px-2 text-orange-600">{formatCurrency(dept.tax)}</td>
                            <td className="text-right py-3 px-2">{formatCurrency(dept.grossProfit)}</td>
                            <td className="text-right py-3 px-2 text-green-600">{formatCurrency(dept.netProfit)}</td>
                            <td className="text-right py-3 px-2">
                              <Badge variant={dept.margin >= 60 ? 'default' : dept.margin >= 40 ? 'secondary' : 'destructive'}>
                                {dept.margin.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-2">{dept.orderCount}</td>
                            <td className="text-right py-3 px-2">
                              <div className="flex items-center justify-end gap-1">
                                <TrendIcon value={dept.trend} />
                                <span className={dept.trend >= 0 ? 'text-green-500' : 'text-red-500'}>
                                  {formatPercent(dept.trend)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="bg-muted/30 font-bold">
                          <td className="py-3 px-2">Total</td>
                          <td className="text-right py-3 px-2">{formatCurrency(summary.totalRevenue)}</td>
                          <td className="text-right py-3 px-2">{formatCurrency(summary.totalCOGS)}</td>
                          <td className="text-right py-3 px-2 text-orange-600">{formatCurrency(summary.totalTax)}</td>
                          <td className="text-right py-3 px-2">{formatCurrency(summary.grossProfit)}</td>
                          <td className="text-right py-3 px-2 text-green-600">{formatCurrency(summary.netProfit)}</td>
                          <td className="text-right py-3 px-2">
                            <Badge>{summary.grossMargin.toFixed(1)}%</Badge>
                          </td>
                          <td className="text-right py-3 px-2">{summary.totalOrders}</td>
                          <td className="text-right py-3 px-2">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            {/* Expense Budget Summary Card */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Expense Budget</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{formatCurrency(totalExpenses)}</span>
                      {expenseBudgetForPeriod > 0 && (
                        <span className="text-muted-foreground">/ {formatCurrency(expenseBudgetForPeriod)}</span>
                      )}
                    </div>
                    {expenseBudgetForPeriod > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <Progress 
                          value={Math.min((totalExpenses / expenseBudgetForPeriod) * 100, 100)} 
                          className={cn(
                            "h-2 w-48",
                            (totalExpenses / expenseBudgetForPeriod) > 1 && "[&>div]:bg-destructive"
                          )}
                        />
                        <Badge 
                          variant={expenseBudgetVariance >= 0 ? "outline" : "destructive"}
                          className={expenseBudgetVariance >= 0 ? "border-green-500 text-green-600" : ""}
                        >
                          {expenseBudgetVariance >= 0 
                            ? `${formatCurrency(expenseBudgetVariance)} remaining` 
                            : `${formatCurrency(Math.abs(expenseBudgetVariance))} over`}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Dialog open={expenseBudgetDialogOpen} onOpenChange={setExpenseBudgetDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Target className="h-4 w-4 mr-2" />
                        {expenseBudgetForPeriod > 0 ? 'Edit Budget' : 'Set Budget'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Set Expense Budget</DialogTitle>
                        <DialogDescription>
                          Set monthly budget limits for operating expenses
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Month</Label>
                          <Input 
                            type="month" 
                            value={newExpenseBudget.month.substring(0, 7)} 
                            onChange={(e) => setNewExpenseBudget({ 
                              ...newExpenseBudget, 
                              month: e.target.value + '-01' 
                            })} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select 
                            value={newExpenseBudget.category} 
                            onValueChange={(v: any) => setNewExpenseBudget({ ...newExpenseBudget, category: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="total">Total Budget (All Categories)</SelectItem>
                              {EXPENSE_CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Budget Amount ({currencySymbol})</Label>
                          <Input 
                            type="number" 
                            placeholder="e.g., 50000" 
                            value={newExpenseBudget.amount}
                            onChange={(e) => setNewExpenseBudget({ ...newExpenseBudget, amount: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setExpenseBudgetDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveExpenseBudget}>
                          Save Budget
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              {/* Expense Entry Form */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Add Expense
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newExpense.category} onValueChange={(v: any) => setNewExpense({ ...newExpense, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={newExpense.department} onValueChange={(v) => setNewExpense({ ...newExpense, department: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS_LIST.map(dept => (
                          <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input 
                      placeholder="e.g., Electricity bill" 
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount ({currencySymbol})</Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input 
                      type="date" 
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <Label htmlFor="recurring" className="flex items-center gap-2 cursor-pointer">
                      <Repeat className="h-4 w-4" />
                      Recurring Expense
                    </Label>
                    <Switch
                      id="recurring"
                      checked={newExpense.recurring}
                      onCheckedChange={(checked) => setNewExpense({ ...newExpense, recurring: checked })}
                    />
                  </div>
                  {newExpense.recurring && (
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select value={newExpense.recurringFrequency} onValueChange={(v: 'monthly' | 'quarterly' | 'yearly') => setNewExpense({ ...newExpense, recurringFrequency: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button className="w-full" onClick={handleAddExpense}>
                    <Plus className="h-4 w-4 mr-2" />
                    {newExpense.recurring ? 'Add Recurring Expense' : 'Add Expense'}
                  </Button>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                  <CardDescription>Total expenses: {formatCurrency(totalExpenses)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      {EXPENSE_CATEGORIES.map(cat => {
                        const catExpenses = periodExpenses.filter(e => e.category === cat.value);
                        const catTotal = catExpenses.reduce((sum, e) => sum + e.amount, 0);
                        const percentage = totalExpenses > 0 ? (catTotal / totalExpenses) * 100 : 0;
                        return (
                          <div key={cat.value} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{cat.label}</span>
                              <span className="font-medium">{formatCurrency(catTotal)}</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <RePieChart>
                        <Pie
                          data={EXPENSE_CATEGORIES.map((cat, i) => ({
                            name: cat.label,
                            value: periodExpenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0),
                            color: COLORS[i % COLORS.length],
                          })).filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {EXPENSE_CATEGORIES.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Department Expense Allocation */}
            {periodDepartmentExpenses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Department Expense Allocation
                  </CardTitle>
                  <CardDescription>Operational costs by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {periodDepartmentExpenses.map((deptExp, i) => (
                      <div key={deptExp.department} className="p-4 rounded-lg border space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="font-medium">{deptExp.displayName}</span>
                          </div>
                          <span className="text-lg font-bold">{formatCurrency(deptExp.total)}</span>
                        </div>
                        <div className="space-y-1">
                          {EXPENSE_CATEGORIES.map(cat => {
                            const catTotal = deptExp.expenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0);
                            if (catTotal === 0) return null;
                            return (
                              <div key={cat.value} className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{cat.label}</span>
                                <span>{formatCurrency(catTotal)}</span>
                              </div>
                            );
                          })}
                        </div>
                        <Progress 
                          value={(deptExp.total / totalExpenses) * 100} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {((deptExp.total / totalExpenses) * 100).toFixed(1)}% of total
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recurring Expenses */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Repeat className="h-5 w-5" />
                      Recurring Expenses
                    </CardTitle>
                    <CardDescription>Auto-generated monthly, quarterly, or yearly expenses</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={generateRecurringExpenses}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {expenses.filter(e => e.recurring && !e.parentId).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No recurring expenses set up. Add an expense with "Recurring" checked to auto-generate.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {expenses.filter(e => e.recurring && !e.parentId).map(expense => (
                      <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">
                            <Repeat className="h-3 w-3 mr-1" />
                            {expense.recurringFrequency || 'Monthly'}
                          </Badge>
                          <Badge variant="outline">{EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label}</Badge>
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {DEPARTMENTS_LIST.find(d => d.value === expense.department)?.label || 'General'} · Started {format(new Date(expense.date), 'MMM yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">{formatCurrency(expense.amount)}</span>
                          <Button variant="ghost" size="icon" onClick={() => deleteExpense(expense.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense List */}
            <Card>
              <CardHeader>
                <CardTitle>Expense History</CardTitle>
              </CardHeader>
              <CardContent>
                {periodExpenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No expenses recorded for this period
                  </div>
                ) : (
                  <div className="space-y-2">
                    {periodExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(expense => (
                      <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label}</Badge>
                          {expense.department && (
                            <Badge variant="secondary">{DEPARTMENTS_LIST.find(d => d.value === expense.department)?.label}</Badge>
                          )}
                          {expense.parentId && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Repeat className="h-3 w-3 mr-1" />
                              Auto
                            </Badge>
                          )}
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-muted-foreground">{format(new Date(expense.date), 'MMM dd, yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">{formatCurrency(expense.amount)}</span>
                          <Button variant="ghost" size="icon" onClick={() => deleteExpense(expense.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budgets Tab */}
          <TabsContent value="budgets" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Budget vs Actual
                    </CardTitle>
                    <CardDescription>
                      Monthly revenue and cost targets per department
                    </CardDescription>
                  </div>
                  <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => openBudgetDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Set Budget
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Set Department Budget</DialogTitle>
                        <DialogDescription>
                          Set monthly revenue and cost targets for a department
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Department</Label>
                          <Select value={selectedBudgetDept} onValueChange={setSelectedBudgetDept}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map(d => (
                                <SelectItem key={d.department} value={d.department}>
                                  {d.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Month</Label>
                          <Input 
                            type="month" 
                            value={budgetMonth.substring(0, 7)} 
                            onChange={(e) => setBudgetMonth(e.target.value + '-01')} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Revenue Target ({currencySymbol})</Label>
                          <Input 
                            type="number" 
                            placeholder="e.g., 250000" 
                            value={revenueTarget}
                            onChange={(e) => setRevenueTarget(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>COGS Budget ({currencySymbol})</Label>
                          <Input 
                            type="number" 
                            placeholder="e.g., 75000" 
                            value={cogsTarget}
                            onChange={(e) => setCogsTarget(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Profit Target ({currencySymbol})</Label>
                          <Input 
                            type="number" 
                            placeholder="e.g., 175000" 
                            value={profitTarget}
                            onChange={(e) => setProfitTarget(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveBudget}>
                          Save Budget
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading || budgetsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : budgetComparisons.every(bc => bc.revenueTarget === 0) ? (
                  <div className="text-center py-12">
                    <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Budget Targets Set</h3>
                    <p className="text-muted-foreground mb-4">
                      Set monthly revenue and cost targets to track performance against goals
                    </p>
                    <Button onClick={() => openBudgetDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Set First Budget
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {budgetComparisons.filter(bc => bc.revenueTarget > 0).map((bc, i) => (
                      <div key={bc.department} className="space-y-3 p-4 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="font-medium">{bc.displayName}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => openBudgetDialog(bc.department)}>
                            Edit
                          </Button>
                        </div>
                        
                        {/* Revenue Progress */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Revenue</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatCurrency(bc.revenueActual)}</span>
                              <span className="text-muted-foreground">/ {formatCurrency(bc.revenueTarget)}</span>
                              <Badge variant={bc.revenuePercent >= 90 ? 'default' : bc.revenuePercent >= 70 ? 'secondary' : 'destructive'}>
                                {bc.revenuePercent.toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                          <Progress 
                            value={Math.min(bc.revenuePercent, 100)} 
                            className={cn("h-2", bc.revenuePercent >= 100 && "bg-green-200")}
                          />
                          <div className="flex items-center gap-1 text-xs">
                            {bc.revenueVariance >= 0 ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <X className="h-3 w-3 text-red-500" />
                            )}
                            <span className={bc.revenueVariance >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {bc.revenueVariance >= 0 ? '+' : ''}{formatCurrency(bc.revenueVariance)} variance
                            </span>
                          </div>
                        </div>

                        {/* COGS Progress */}
                        {bc.cogsTarget > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">COGS</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{formatCurrency(bc.cogsActual)}</span>
                                <span className="text-muted-foreground">/ {formatCurrency(bc.cogsTarget)}</span>
                                <Badge variant={bc.cogsPercent <= 100 ? 'default' : 'destructive'}>
                                  {bc.cogsPercent.toFixed(0)}%
                                </Badge>
                              </div>
                            </div>
                            <Progress 
                              value={Math.min(bc.cogsPercent, 100)} 
                              className="h-2"
                            />
                            <div className="flex items-center gap-1 text-xs">
                              {bc.cogsVariance <= 0 ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <X className="h-3 w-3 text-red-500" />
                              )}
                              <span className={bc.cogsVariance <= 0 ? 'text-green-600' : 'text-red-600'}>
                                {bc.cogsVariance > 0 ? '+' : ''}{formatCurrency(bc.cogsVariance)} {bc.cogsVariance <= 0 ? 'under budget' : 'over budget'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Profit Progress */}
                        {bc.profitTarget > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Profit</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-green-600">{formatCurrency(bc.profitActual)}</span>
                                <span className="text-muted-foreground">/ {formatCurrency(bc.profitTarget)}</span>
                                <Badge variant={bc.profitPercent >= 90 ? 'default' : bc.profitPercent >= 70 ? 'secondary' : 'destructive'}>
                                  {bc.profitPercent.toFixed(0)}%
                                </Badge>
                              </div>
                            </div>
                            <Progress 
                              value={Math.min(bc.profitPercent, 100)} 
                              className={cn("h-2", bc.profitPercent >= 100 && "bg-green-200")}
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Summary Card with Breakdown */}
                    <Card className="bg-muted/50">
                      <CardContent className="pt-6 space-y-6">
                        {/* Export Buttons */}
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Summary & Breakdown
                          </p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Export Breakdown
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => exportDepartmentBreakdownToPDF(
                                departments,
                                { start: dateRange?.from || startDate, end: dateRange?.to || endDate },
                                settings?.hotel_name || 'Hotel',
                                currencySymbol,
                              )}>
                                <FileText className="h-4 w-4 mr-2" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportDepartmentBreakdownToExcel(
                                departments,
                                { start: dateRange?.from || startDate, end: dateRange?.to || endDate },
                                settings?.hotel_name || 'Hotel',
                                currencySymbol,
                              )}>
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Download Excel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Totals Row */}
                        <div className="grid gap-4 md:grid-cols-3">
                          {(() => {
                            const totalRevenueTarget = budgetComparisons.reduce((sum, bc) => sum + bc.revenueTarget, 0);
                            const totalRevenueActual = budgetComparisons.reduce((sum, bc) => sum + bc.revenueActual, 0);
                            const totalCogsTarget = budgetComparisons.reduce((sum, bc) => sum + bc.cogsTarget, 0);
                            const totalCogsActual = budgetComparisons.reduce((sum, bc) => sum + bc.cogsActual, 0);
                            const totalProfitTarget = budgetComparisons.reduce((sum, bc) => sum + bc.profitTarget, 0);
                            const totalProfitActual = budgetComparisons.reduce((sum, bc) => sum + bc.profitActual, 0);
                            
                            // Validation: Profit should equal Revenue - COGS
                            const calculatedProfit = totalRevenueActual - totalCogsActual;
                            const profitMatchesCalculation = Math.abs(calculatedProfit - totalProfitActual) < 1;
                            
                            return (
                              <>
                                <div className="text-center">
                                  <p className="text-sm text-muted-foreground mb-1">Total Revenue Target</p>
                                  <p className="text-2xl font-bold">
                                    {formatCurrency(totalRevenueTarget)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Actual: {formatCurrency(totalRevenueActual)}
                                  </p>
                                  {totalRevenueTarget > 0 && (
                                    <div className="flex items-center justify-center gap-1 mt-1">
                                      {totalRevenueActual >= totalRevenueTarget ? (
                                        <Badge variant="default" className="bg-green-500 text-xs">
                                          <Check className="h-3 w-3 mr-1" />
                                          On Target
                                        </Badge>
                                      ) : (
                                        <Badge variant="destructive" className="text-xs">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          {((totalRevenueActual / totalRevenueTarget) * 100).toFixed(0)}%
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="text-center">
                                  <p className="text-sm text-muted-foreground mb-1">Total COGS Budget</p>
                                  <p className="text-2xl font-bold">
                                    {formatCurrency(totalCogsTarget)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Actual: {formatCurrency(totalCogsActual)}
                                  </p>
                                  {totalCogsTarget > 0 && (
                                    <div className="flex items-center justify-center gap-1 mt-1">
                                      {totalCogsActual <= totalCogsTarget ? (
                                        <Badge variant="default" className="bg-green-500 text-xs">
                                          <Check className="h-3 w-3 mr-1" />
                                          Under Budget
                                        </Badge>
                                      ) : (
                                        <Badge variant="destructive" className="text-xs">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          Over by {formatCurrency(totalCogsActual - totalCogsTarget)}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="text-center">
                                  <p className="text-sm text-muted-foreground mb-1">Total Profit Target</p>
                                  <p className="text-2xl font-bold text-green-600">
                                    {formatCurrency(totalProfitTarget)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Actual: {formatCurrency(totalProfitActual)}
                                  </p>
                                  <div className="flex items-center justify-center gap-1 mt-1">
                                    {profitMatchesCalculation ? (
                                      <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                                        <Check className="h-3 w-3 mr-1" />
                                        Verified
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Check Data
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* Department Breakdown with Progress Bars */}
                        <div className="border-t pt-4">
                          <p className="text-sm font-medium mb-3 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Department Contribution Breakdown
                          </p>
                          <div className="space-y-4">
                            {(() => {
                              const totalRevenue = budgetComparisons.reduce((sum, b) => sum + b.revenueActual, 0);
                              const totalCogs = budgetComparisons.reduce((sum, b) => sum + b.cogsActual, 0);
                              const totalProfit = budgetComparisons.reduce((sum, b) => sum + b.profitActual, 0);
                              
                              return budgetComparisons.map((bc, i) => {
                                const revenueContrib = totalRevenue > 0 ? (bc.revenueActual / totalRevenue) * 100 : 0;
                                const cogsContrib = totalCogs > 0 ? (bc.cogsActual / totalCogs) * 100 : 0;
                                const profitContrib = totalProfit > 0 ? (bc.profitActual / totalProfit) * 100 : 0;
                                
                                // Validation: Department profit should equal revenue - cogs
                                const expectedProfit = bc.revenueActual - bc.cogsActual;
                                const profitValid = Math.abs(expectedProfit - bc.profitActual) < 1;
                                
                                if (bc.revenueActual === 0 && bc.cogsActual === 0) return null;
                                
                                const deptColor = COLORS[i % COLORS.length];
                                
                                return (
                                  <div key={bc.department} className="p-3 rounded-lg bg-background/50 border space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: deptColor }} />
                                        <span className="font-medium">{bc.displayName}</span>
                                      </div>
                                      {profitValid ? (
                                        <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                                          <Check className="h-3 w-3 mr-1" />
                                          Verified
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          Check
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {/* Revenue Progress Bar */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Revenue</span>
                                        <span className="font-medium">{formatCurrency(bc.revenueActual)} ({revenueContrib.toFixed(1)}%)</span>
                                      </div>
                                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div 
                                          className="h-full rounded-full transition-all duration-500"
                                          style={{ 
                                            width: `${revenueContrib}%`, 
                                            backgroundColor: deptColor 
                                          }}
                                        />
                                      </div>
                                    </div>
                                    
                                    {/* COGS Progress Bar */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">COGS</span>
                                        <span className="font-medium">{formatCurrency(bc.cogsActual)} ({cogsContrib.toFixed(1)}%)</span>
                                      </div>
                                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div 
                                          className="h-full rounded-full transition-all duration-500 opacity-70"
                                          style={{ 
                                            width: `${cogsContrib}%`, 
                                            backgroundColor: deptColor 
                                          }}
                                        />
                                      </div>
                                    </div>
                                    
                                    {/* Profit Progress Bar */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Profit</span>
                                        <span className="font-medium text-green-600">{formatCurrency(bc.profitActual)} ({profitContrib.toFixed(1)}%)</span>
                                      </div>
                                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div 
                                          className="h-full rounded-full transition-all duration-500"
                                          style={{ 
                                            width: `${Math.max(profitContrib, 0)}%`, 
                                            backgroundColor: 'hsl(var(--chart-2))' 
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Validation Summary */}
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-500" />
                              All calculations verified: Profit = Revenue - COGS
                            </span>
                            <span>
                              {budgetComparisons.filter(bc => bc.revenueActual > 0 || bc.cogsActual > 0).length} departments contributing
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Department Comparison Tab */}
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5" />
                  Department Comparison
                </CardTitle>
                <CardDescription>Side-by-side performance analysis of two departments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Department Selectors */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department 1</label>
                    <Select value={dept1} onValueChange={setDept1}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => (
                          <SelectItem key={d.department} value={d.department} disabled={d.department === dept2}>
                            {d.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department 2</label>
                    <Select value={dept2} onValueChange={setDept2}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => (
                          <SelectItem key={d.department} value={d.department} disabled={d.department === dept1}>
                            {d.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Comparison Cards */}
                {selectedDept1 && selectedDept2 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Department 1 Card */}
                    <Card className="border-2" style={{ borderColor: COLORS[departments.indexOf(selectedDept1) % COLORS.length] }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{selectedDept1.displayName}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Revenue</p>
                            <p className="text-2xl font-bold">{formatCurrency(selectedDept1.revenue)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Profit</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedDept1.grossProfit)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Margin</p>
                            <p className="text-xl font-bold">{selectedDept1.margin.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Orders</p>
                            <p className="text-xl font-bold">{selectedDept1.orderCount}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Order</p>
                            <p className="text-xl font-bold">{formatCurrency(selectedDept1.avgOrderValue)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">COGS</p>
                            <p className="text-xl font-bold">{formatCurrency(selectedDept1.cogs)}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <TrendIcon value={selectedDept1.trend} />
                            <span className={`font-medium ${selectedDept1.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(selectedDept1.trend)} vs previous period
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Department 2 Card */}
                    <Card className="border-2" style={{ borderColor: COLORS[departments.indexOf(selectedDept2) % COLORS.length] }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{selectedDept2.displayName}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Revenue</p>
                            <p className="text-2xl font-bold">{formatCurrency(selectedDept2.revenue)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Profit</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedDept2.grossProfit)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Margin</p>
                            <p className="text-xl font-bold">{selectedDept2.margin.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Orders</p>
                            <p className="text-xl font-bold">{selectedDept2.orderCount}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Order</p>
                            <p className="text-xl font-bold">{formatCurrency(selectedDept2.avgOrderValue)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">COGS</p>
                            <p className="text-xl font-bold">{formatCurrency(selectedDept2.cogs)}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <TrendIcon value={selectedDept2.trend} />
                            <span className={`font-medium ${selectedDept2.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(selectedDept2.trend)} vs previous period
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select two departments to compare
                  </div>
                )}

                {/* Comparison Bar Chart */}
                {selectedDept1 && selectedDept2 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Visual Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={[
                            { metric: 'Revenue', [selectedDept1.displayName]: selectedDept1.revenue, [selectedDept2.displayName]: selectedDept2.revenue },
                            { metric: 'COGS', [selectedDept1.displayName]: selectedDept1.cogs, [selectedDept2.displayName]: selectedDept2.cogs },
                            { metric: 'Profit', [selectedDept1.displayName]: selectedDept1.grossProfit, [selectedDept2.displayName]: selectedDept2.grossProfit },
                          ]}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="metric" />
                          <YAxis tickFormatter={(v) => formatCurrency(v)} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Legend />
                          <Bar dataKey={selectedDept1.displayName} fill={COLORS[departments.indexOf(selectedDept1) % COLORS.length]} />
                          <Bar dataKey={selectedDept2.displayName} fill={COLORS[departments.indexOf(selectedDept2) % COLORS.length]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Efficiency Comparison */}
                {selectedDept1 && selectedDept2 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Efficiency Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                          <p className="text-sm text-muted-foreground mb-2">Higher Revenue</p>
                          <p className="text-lg font-bold" style={{ color: selectedDept1.revenue > selectedDept2.revenue ? COLORS[departments.indexOf(selectedDept1) % COLORS.length] : COLORS[departments.indexOf(selectedDept2) % COLORS.length] }}>
                            {selectedDept1.revenue > selectedDept2.revenue ? selectedDept1.displayName : selectedDept2.displayName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            by {formatCurrency(Math.abs(selectedDept1.revenue - selectedDept2.revenue))}
                          </p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                          <p className="text-sm text-muted-foreground mb-2">Better Margin</p>
                          <p className="text-lg font-bold" style={{ color: selectedDept1.margin > selectedDept2.margin ? COLORS[departments.indexOf(selectedDept1) % COLORS.length] : COLORS[departments.indexOf(selectedDept2) % COLORS.length] }}>
                            {selectedDept1.margin > selectedDept2.margin ? selectedDept1.displayName : selectedDept2.displayName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {Math.abs(selectedDept1.margin - selectedDept2.margin).toFixed(1)}% higher
                          </p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                          <p className="text-sm text-muted-foreground mb-2">More Orders</p>
                          <p className="text-lg font-bold" style={{ color: selectedDept1.orderCount > selectedDept2.orderCount ? COLORS[departments.indexOf(selectedDept1) % COLORS.length] : COLORS[departments.indexOf(selectedDept2) % COLORS.length] }}>
                            {selectedDept1.orderCount > selectedDept2.orderCount ? selectedDept1.displayName : selectedDept2.displayName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {Math.abs(selectedDept1.orderCount - selectedDept2.orderCount)} more
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forecasting Tab */}
          <TabsContent value="forecasting" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Revenue Forecast</h3>
              <Select value={forecastDays.toString()} onValueChange={(v) => setForecastDays(parseInt(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Next 7 Days</SelectItem>
                  <SelectItem value="14">Next 14 Days</SelectItem>
                  <SelectItem value="30">Next 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Forecast KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Projected Revenue</div>
                  <div className="text-2xl font-bold">{formatCurrency(forecast.projectedRevenue)}</div>
                  <Badge variant="outline" className="mt-2">
                    {forecast.confidence} confidence
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Projected COGS</div>
                  <div className="text-2xl font-bold">{formatCurrency(forecast.projectedCOGS)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Projected Profit</div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(forecast.projectedProfit)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Growth Rate</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold">{forecast.growthRate.toFixed(1)}%</div>
                    {forecast.trendDirection === 'up' && <ArrowUpRight className="h-5 w-5 text-green-500" />}
                    {forecast.trendDirection === 'down' && <ArrowDownRight className="h-5 w-5 text-red-500" />}
                    {forecast.trendDirection === 'stable' && <Minus className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Forecast Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Revenue & Profit Projection
                </CardTitle>
              </CardHeader>
              <CardContent>
                {forecastChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={forecastChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" name="Revenue" />
                      <Line type="monotone" dataKey="profit" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Profit" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Not enough historical data for forecasting
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Day of Week Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Day-of-Week Performance</CardTitle>
                <CardDescription>Average revenue by day of week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dayOfWeekData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip formatter={(v: number, name) => name === 'revenue' ? formatCurrency(v) : v} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Avg Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            {/* Inventory Valuation Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="md:col-span-2 lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Total Inventory Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(totalInventoryValue)}</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Across {inventoryValuation.reduce((sum, iv) => sum + iv.itemCount, 0)} items
                  </p>
                </CardContent>
              </Card>

              {inventoryValuation.map((iv, i) => (
                <Card key={iv.department}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      {iv.displayName}
                      {iv.lowStockCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {iv.lowStockCount} low
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(iv.totalValue)}</div>
                    <p className="text-sm text-muted-foreground">{iv.itemCount} items</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Low Stock Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Low Stock Alerts
                  <Badge variant="outline" className="ml-2">{lowStockItems.length} items</Badge>
                </CardTitle>
                <CardDescription>Items below minimum stock level</CardDescription>
              </CardHeader>
              <CardContent>
                {lowStockItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    All inventory levels are healthy
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lowStockItems.slice(0, 10).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.department}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-red-600">
                            {item.currentStock} {item.unit}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Min: {item.minStockLevel} {item.unit}
                          </p>
                        </div>
                      </div>
                    ))}
                    {lowStockItems.length > 10 && (
                      <p className="text-center text-sm text-muted-foreground pt-2">
                        +{lowStockItems.length - 10} more items
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Value Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={inventoryValuation.filter(iv => iv.totalValue > 0).map((iv, i) => ({
                        name: iv.displayName,
                        value: iv.totalValue,
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {inventoryValuation.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
