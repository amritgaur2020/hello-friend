import { useState } from 'react';
import { useComparativePLData, ComparisonMode } from '@/hooks/useComparativePLData';
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
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  GitCompare,
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { exportComparativePLReport } from '@/utils/plReportExport';

const CHART_COLORS = {
  current: 'hsl(var(--chart-1))',
  previous: 'hsl(var(--chart-2))',
  positive: 'hsl(var(--success))',
  negative: 'hsl(var(--destructive))',
};

export function ComparativePLReport() {
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('mom');

  const {
    currentPeriod,
    previousPeriod,
    variances,
    departmentVariances,
    isLoading,
    refetch,
  } = useComparativePLData({ comparisonMode });

  const formatCurrency = (value: number): string => {
    if (!isFinite(value) || isNaN(value)) return `${currencySymbol}0`;
    const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${currencySymbol}${formatted}`;
  };

  const formatPercent = (value: number): string => {
    if (!isFinite(value) || isNaN(value)) return '0%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (isPositive: boolean, change: number) => {
    if (change === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    return isPositive ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getVarianceColor = (isPositive: boolean, change: number) => {
    if (change === 0) return 'text-muted-foreground';
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const handleExport = () => {
    exportComparativePLReport({
      currentPeriod,
      previousPeriod,
      variances,
      departmentVariances,
      hotelName: settings?.hotel_name,
      currencySymbol,
    });
  };

  // Prepare chart data
  const comparisonChartData = [
    { name: 'Revenue', current: currentPeriod.revenue, previous: previousPeriod.revenue },
    { name: 'COGS', current: currentPeriod.cogs, previous: previousPeriod.cogs },
    { name: 'Gross Profit', current: currentPeriod.grossProfit, previous: previousPeriod.grossProfit },
    { name: 'Net Profit', current: currentPeriod.netProfit, previous: previousPeriod.netProfit },
  ];

  const departmentChartData = departmentVariances.map(dept => ({
    name: dept.displayName,
    current: currentPeriod.departments.find(d => d.department === dept.department)?.revenue || 0,
    previous: previousPeriod.departments.find(d => d.department === dept.department)?.revenue || 0,
    change: dept.revenueChangePercent,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Compare:</span>
          </div>
          <Select value={comparisonMode} onValueChange={(v) => setComparisonMode(v as ComparisonMode)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mom">Month over Month</SelectItem>
              <SelectItem value="qoq">Quarter over Quarter</SelectItem>
              <SelectItem value="yoy">Year over Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Period Labels */}
      <div className="flex items-center justify-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: CHART_COLORS.current }} />
          <span className="font-medium">{currentPeriod.label}</span>
          <Badge variant="outline" className="ml-2">
            <Calendar className="h-3 w-3 mr-1" />
            {format(currentPeriod.dateRange.start, 'MMM d')} - {format(currentPeriod.dateRange.end, 'MMM d, yyyy')}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: CHART_COLORS.previous }} />
          <span className="font-medium">{previousPeriod.label}</span>
          <Badge variant="outline" className="ml-2">
            <Calendar className="h-3 w-3 mr-1" />
            {format(previousPeriod.dateRange.start, 'MMM d')} - {format(previousPeriod.dateRange.end, 'MMM d, yyyy')}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(currentPeriod.revenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getTrendIcon(variances[0]?.isPositive || false, variances[0]?.change || 0)}
              <span className={getVarianceColor(variances[0]?.isPositive || false, variances[0]?.change || 0)}>
                {formatPercent(variances[0]?.changePercent || 0)}
              </span>
              <span className="text-muted-foreground text-sm">vs {previousPeriod.label}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gross Profit</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(currentPeriod.grossProfit)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getTrendIcon(variances[2]?.isPositive || false, variances[2]?.change || 0)}
              <span className={getVarianceColor(variances[2]?.isPositive || false, variances[2]?.change || 0)}>
                {formatPercent(variances[2]?.changePercent || 0)}
              </span>
              <span className="text-muted-foreground text-sm">({currentPeriod.grossMargin.toFixed(1)}% margin)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Profit</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(currentPeriod.netProfit)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getTrendIcon(variances[5]?.isPositive || false, variances[5]?.change || 0)}
              <span className={getVarianceColor(variances[5]?.isPositive || false, variances[5]?.change || 0)}>
                {formatPercent(variances[5]?.changePercent || 0)}
              </span>
              <span className="text-muted-foreground text-sm">({currentPeriod.netMargin.toFixed(1)}% margin)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Financial Comparison
          </CardTitle>
          <CardDescription>Side-by-side comparison of key financial metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: 'var(--foreground)' }}
                  contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                />
                <Legend />
                <Bar dataKey="current" name={currentPeriod.label} fill={CHART_COLORS.current} radius={[0, 4, 4, 0]} />
                <Bar dataKey="previous" name={previousPeriod.label} fill={CHART_COLORS.previous} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Variance Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle>Variance Analysis</CardTitle>
          <CardDescription>Detailed breakdown of changes between periods</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">{currentPeriod.label}</TableHead>
                <TableHead className="text-right">{previousPeriod.label}</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Change %</TableHead>
                <TableHead className="text-center">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variances.map((v) => (
                <TableRow key={v.metric}>
                  <TableCell className="font-medium">{v.metric}</TableCell>
                  <TableCell className="text-right">
                    {v.metric.includes('%') ? `${v.current.toFixed(1)}%` : formatCurrency(v.current)}
                  </TableCell>
                  <TableCell className="text-right">
                    {v.metric.includes('%') ? `${v.previous.toFixed(1)}%` : formatCurrency(v.previous)}
                  </TableCell>
                  <TableCell className={`text-right ${getVarianceColor(v.isPositive, v.change)}`}>
                    {v.metric.includes('%') 
                      ? `${v.change >= 0 ? '+' : ''}${v.change.toFixed(1)}pp`
                      : `${v.change >= 0 ? '+' : ''}${formatCurrency(v.change)}`
                    }
                  </TableCell>
                  <TableCell className={`text-right ${getVarianceColor(v.isPositive, v.change)}`}>
                    {formatPercent(v.changePercent)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getTrendIcon(v.isPositive, v.change)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Department Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Department Performance Comparison</CardTitle>
          <CardDescription>Revenue and profit changes by department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                />
                <Legend />
                <Bar dataKey="current" name={currentPeriod.label} fill={CHART_COLORS.current} radius={[4, 4, 0, 0]} />
                <Bar dataKey="previous" name={previousPeriod.label} fill={CHART_COLORS.previous} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Revenue Change</TableHead>
                <TableHead className="text-right">Profit Change</TableHead>
                <TableHead className="text-right">Margin Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departmentVariances.map((dept) => (
                <TableRow key={dept.department}>
                  <TableCell className="font-medium">{dept.displayName}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={dept.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(dept.revenueChange)}
                      </span>
                      <Badge variant={dept.revenueChange >= 0 ? 'default' : 'destructive'} className="text-xs">
                        {dept.revenueChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {formatPercent(dept.revenueChangePercent)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={dept.profitChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(dept.profitChange)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={dept.marginChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {dept.marginChange >= 0 ? '+' : ''}{dept.marginChange.toFixed(1)}pp
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}