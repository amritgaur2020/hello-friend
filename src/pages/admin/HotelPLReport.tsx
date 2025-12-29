import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { useHotelPLData, DepartmentPLData } from '@/hooks/useHotelPLData';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
} from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

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
    isLoading,
    refetch,
  } = useHotelPLData({
    startDate: dateRange?.from || startDate,
    endDate: dateRange?.to || endDate,
    comparisonType,
    forecastDays,
  });

  // Set default department selections when data loads
  if (departments.length >= 2 && !dept1 && !dept2) {
    setDept1(departments[0]?.department || '');
    setDept2(departments[1]?.department || '');
  }

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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.netProfit)}</div>
                  {comparison && (
                    <div className="flex items-center gap-1 text-sm">
                      <TrendIcon value={comparison.changes.netProfit.percentage} />
                      <span className={comparison.changes.netProfit.percentage >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {formatPercent(comparison.changes.netProfit.percentage)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
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
                          <th className="text-right py-3 px-2 font-medium">Gross Profit</th>
                          <th className="text-right py-3 px-2 font-medium">Margin</th>
                          <th className="text-right py-3 px-2 font-medium">Orders</th>
                          <th className="text-right py-3 px-2 font-medium">Avg Order</th>
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
                            <td className="text-right py-3 px-2 text-green-600">{formatCurrency(dept.grossProfit)}</td>
                            <td className="text-right py-3 px-2">
                              <Badge variant={dept.margin >= 60 ? 'default' : dept.margin >= 40 ? 'secondary' : 'destructive'}>
                                {dept.margin.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-2">{dept.orderCount}</td>
                            <td className="text-right py-3 px-2">{formatCurrency(dept.avgOrderValue)}</td>
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
                          <td className="text-right py-3 px-2 text-green-600">{formatCurrency(summary.grossProfit)}</td>
                          <td className="text-right py-3 px-2">
                            <Badge>{summary.grossMargin.toFixed(1)}%</Badge>
                          </td>
                          <td className="text-right py-3 px-2">{summary.totalOrders}</td>
                          <td className="text-right py-3 px-2">{formatCurrency(summary.avgOrderValue)}</td>
                          <td className="text-right py-3 px-2">-</td>
                        </tr>
                      </tbody>
                    </table>
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
