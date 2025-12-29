import { useState } from 'react';
import { useTrendAnalysis } from '@/hooks/useTrendAnalysis';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  LineChart,
  BarChart3,
  Calendar,
  Target,
  Activity,
  Zap,
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart as ReLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ComposedChart,
  ReferenceLine,
} from 'recharts';

const CHART_COLORS = {
  revenue: 'hsl(var(--chart-1))',
  grossProfit: 'hsl(var(--chart-2))',
  netProfit: 'hsl(var(--chart-3))',
  cogs: 'hsl(var(--chart-4))',
  margin: 'hsl(var(--chart-5))',
};

const DEPARTMENT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function TrendAnalysisCharts() {
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  const [monthsToShow, setMonthsToShow] = useState<number>(6);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area');

  const {
    monthlyData,
    metrics,
    isLoading,
    refetch,
  } = useTrendAnalysis({ months: monthsToShow });

  const formatCurrency = (value: number): string => {
    if (!isFinite(value) || isNaN(value)) return `${currencySymbol}0`;
    if (value >= 100000) {
      return `${currencySymbol}${(value / 100000).toFixed(1)}L`;
    }
    if (value >= 1000) {
      return `${currencySymbol}${(value / 1000).toFixed(1)}K`;
    }
    return `${currencySymbol}${Math.round(value)}`;
  };

  const formatFullCurrency = (value: number): string => {
    if (!isFinite(value) || isNaN(value)) return `${currencySymbol}0`;
    const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${currencySymbol}${formatted}`;
  };

  const formatPercent = (value: number): string => {
    if (!isFinite(value) || isNaN(value)) return '0%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 2) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < -2) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getMarginTrendBadge = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <Badge className="bg-green-100 text-green-800">Improving</Badge>;
      case 'declining':
        return <Badge className="bg-red-100 text-red-800">Declining</Badge>;
      default:
        return <Badge variant="secondary">Stable</Badge>;
    }
  };

  // Prepare department trend data
  const departmentTrendData = monthlyData.map(month => {
    const deptData: any = { month: month.monthLabel };
    month.departments.forEach(dept => {
      deptData[dept.displayName] = dept.revenue;
    });
    return deptData;
  });

  const departments = monthlyData[0]?.departments.map(d => d.displayName) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}:</span>
              <span className="font-medium">
                {entry.name.includes('Margin') ? `${entry.value?.toFixed(1)}%` : formatFullCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Trend Analysis</span>
          </div>
          <Select value={monthsToShow.toString()} onValueChange={(v) => setMonthsToShow(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 Months</SelectItem>
              <SelectItem value="6">Last 6 Months</SelectItem>
              <SelectItem value="12">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={chartType} onValueChange={(v) => setChartType(v as 'line' | 'area' | 'bar')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="area">Area Chart</SelectItem>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="bar">Bar Chart</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Trend Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue Growth
            </CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {formatPercent(metrics.revenueGrowth)}
              {getTrendIcon(metrics.revenueGrowth)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Avg: {formatFullCurrency(metrics.averageMonthlyRevenue)}/mo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Profit Growth
            </CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {formatPercent(metrics.profitGrowth)}
              {getTrendIcon(metrics.profitGrowth)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Avg: {formatFullCurrency(metrics.averageMonthlyProfit)}/mo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Margin Trend
            </CardDescription>
            <CardTitle className="text-xl">
              {getMarginTrendBadge(metrics.marginTrend)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Volatility: {metrics.revenueVolatility.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Best Month
            </CardDescription>
            <CardTitle className="text-lg">
              {metrics.bestMonth?.month || 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {metrics.bestMonth ? formatFullCurrency(metrics.bestMonth.revenue) : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Profit Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue & Profit Trends
          </CardTitle>
          <CardDescription>Monthly revenue, gross profit, and net profit over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.netProfit} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={CHART_COLORS.netProfit} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="monthLabel" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.revenue} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="grossProfit" name="Gross Profit" stroke={CHART_COLORS.grossProfit} fillOpacity={0.3} fill={CHART_COLORS.grossProfit} />
                  <Area type="monotone" dataKey="netProfit" name="Net Profit" stroke={CHART_COLORS.netProfit} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              ) : chartType === 'line' ? (
                <ReLineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="monthLabel" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.revenue} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="grossProfit" name="Gross Profit" stroke={CHART_COLORS.grossProfit} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke={CHART_COLORS.netProfit} strokeWidth={2} dot={{ r: 4 }} />
                </ReLineChart>
              ) : (
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="monthLabel" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="grossProfit" name="Gross Profit" fill={CHART_COLORS.grossProfit} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="netProfit" name="Net Profit" fill={CHART_COLORS.netProfit} radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Margin Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Margin Trends</CardTitle>
          <CardDescription>Gross and net profit margin percentage over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="monthLabel" />
                <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                />
                <Legend />
                <ReferenceLine y={metrics.averageMonthlyProfit > 0 ? (monthlyData.reduce((s, m) => s + m.netMargin, 0) / monthlyData.length) : 0} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label={{ value: 'Avg', position: 'right' }} />
                <Line type="monotone" dataKey="grossMargin" name="Gross Margin %" stroke={CHART_COLORS.grossProfit} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="netMargin" name="Net Margin %" stroke={CHART_COLORS.netProfit} strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Department Revenue Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Department Revenue Trends</CardTitle>
          <CardDescription>Revenue breakdown by department over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={departmentTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {departments.map((dept, index) => (
                  <Area 
                    key={dept}
                    type="monotone" 
                    dataKey={dept} 
                    stackId="1"
                    stroke={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]} 
                    fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Summary</CardTitle>
          <CardDescription>Detailed monthly financial data</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">COGS</TableHead>
                <TableHead className="text-right">Gross Profit</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
                <TableHead className="text-right">Net Profit</TableHead>
                <TableHead className="text-right">Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((month, index) => {
                const prevMonth = monthlyData[index - 1];
                const revenueChange = prevMonth ? ((month.revenue - prevMonth.revenue) / (prevMonth.revenue || 1)) * 100 : 0;
                
                return (
                  <TableRow key={month.month}>
                    <TableCell className="font-medium">{month.monthLabel}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {formatFullCurrency(month.revenue)}
                        {prevMonth && (
                          <span className={`text-xs ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {revenueChange >= 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : <ArrowDownRight className="h-3 w-3 inline" />}
                            {Math.abs(revenueChange).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatFullCurrency(month.cogs)}</TableCell>
                    <TableCell className="text-right">{formatFullCurrency(month.grossProfit)}</TableCell>
                    <TableCell className="text-right">{month.grossMargin.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <span className={month.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatFullCurrency(month.netProfit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{month.orderCount}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}