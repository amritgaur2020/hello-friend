import { useSeasonalityAnalysis } from '@/hooks/useSeasonalityAnalysis';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Sun,
  Snowflake,
  Cloud,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Calendar,
  Target,
  AlertTriangle,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ComposedChart,
  Line,
  Area,
} from 'recharts';
import { useState } from 'react';

const SEASON_COLORS = {
  peak: 'hsl(var(--chart-1))',
  high: 'hsl(var(--chart-2))',
  normal: 'hsl(var(--chart-3))',
  low: 'hsl(var(--chart-4))',
  'off-peak': 'hsl(var(--chart-5))',
};

const SEASON_BADGES = {
  peak: { label: 'Peak', variant: 'default' as const, icon: Sun },
  high: { label: 'High', variant: 'secondary' as const, icon: TrendingUp },
  normal: { label: 'Normal', variant: 'outline' as const, icon: Cloud },
  low: { label: 'Low', variant: 'outline' as const, icon: TrendingDown },
  'off-peak': { label: 'Off-Peak', variant: 'destructive' as const, icon: Snowflake },
};

export function SeasonalityAnalysis() {
  const [yearsBack, setYearsBack] = useState(2);
  const { monthlyData, quarterlyData, metrics, isLoading } = useSeasonalityAnalysis({ yearsBack });
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';

  const formatCurrency = (value: number) => 
    `${currencySymbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  // Prepare chart data
  const monthlyChartData = monthlyData.map(m => ({
    name: m.monthName,
    revenue: m.avgRevenue,
    orders: m.avgOrders,
    profit: m.avgProfit,
    seasonType: m.seasonType,
    percentFromAvg: m.percentFromAverage,
  }));

  const radarData = monthlyData.map(m => ({
    month: m.monthName,
    revenue: m.avgRevenue,
    fullMark: Math.max(...monthlyData.map(d => d.avgRevenue)) * 1.2,
  }));

  const quarterlyChartData = quarterlyData.map(q => ({
    name: q.quarterName.split(' ')[0],
    fullName: q.quarterName,
    revenue: q.avgRevenue,
    orders: q.avgOrders,
    seasonType: q.seasonType,
    percentFromAvg: q.percentFromAverage,
  }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Analysis Period:</span>
        </div>
        <Select value={yearsBack.toString()} onValueChange={v => setYearsBack(parseInt(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 1 Year</SelectItem>
            <SelectItem value="2">Last 2 Years</SelectItem>
            <SelectItem value="3">Last 3 Years</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sun className="h-4 w-4 text-orange-500" />
              Peak Season
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.bestMonth.month}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(metrics.bestMonth.avgRevenue)}
            </p>
            {metrics.peakMonths.length > 1 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {metrics.peakMonths.slice(0, 3).map(m => (
                  <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Snowflake className="h-4 w-4 text-blue-500" />
              Low Season
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.worstMonth.month}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(metrics.worstMonth.avgRevenue)}
            </p>
            {metrics.lowMonths.length > 1 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {metrics.lowMonths.slice(0, 3).map(m => (
                  <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              Seasonality Index
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.seasonalityIndex.toFixed(0)}%</div>
            <Progress value={metrics.seasonalityIndex} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.seasonalityIndex < 20 ? 'Stable business' : 
               metrics.seasonalityIndex < 40 ? 'Moderate variation' : 'High seasonal impact'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Next Month Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.predictedNextMonthRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on historical patterns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {metrics.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Seasonal Insights
            </CardTitle>
            <CardDescription>Key findings from your historical data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {metrics.insights.map((insight, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-lg border ${
                    insight.impact === 'high' ? 'border-orange-500/50 bg-orange-500/5' :
                    insight.impact === 'medium' ? 'border-blue-500/50 bg-blue-500/5' :
                    'border-muted bg-muted/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      insight.type === 'peak' ? 'bg-orange-500/10 text-orange-500' :
                      insight.type === 'low' ? 'bg-blue-500/10 text-blue-500' :
                      insight.type === 'trend' ? 'bg-purple-500/10 text-purple-500' :
                      'bg-green-500/10 text-green-500'
                    }`}>
                      {insight.type === 'peak' ? <Sun className="h-4 w-4" /> :
                       insight.type === 'low' ? <Snowflake className="h-4 w-4" /> :
                       insight.type === 'trend' ? <TrendingUp className="h-4 w-4" /> :
                       <Lightbulb className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'secondary' : 'outline'} className="text-xs">
                          {insight.impact}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Revenue Pattern */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Pattern</CardTitle>
            <CardDescription>Average revenue by month with season classification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={v => `${currencySymbol}${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'revenue' ? formatCurrency(value) : value.toFixed(0),
                      name === 'revenue' ? 'Avg Revenue' : 'Avg Orders'
                    ]}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {monthlyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEASON_COLORS[entry.seasonType]} />
                    ))}
                  </Bar>
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="hsl(var(--foreground))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--foreground))', strokeWidth: 2 }}
                    yAxisId={1}
                  />
                  <YAxis yAxisId={1} orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {Object.entries(SEASON_BADGES).map(([key, { label, icon: Icon }]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: SEASON_COLORS[key as keyof typeof SEASON_COLORS] }} />
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Seasonal Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Seasonal Distribution</CardTitle>
            <CardDescription>Revenue distribution across the year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="hsl(var(--muted))" />
                  <PolarAngleAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <Radar
                    name="Revenue"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.5}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Avg Revenue']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quarterly Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Quarterly Performance</CardTitle>
            <CardDescription>Revenue comparison by quarter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={v => `${currencySymbol}${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Avg Revenue']}
                    labelFormatter={(label) => quarterlyChartData.find(q => q.name === label)?.fullName || label}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                    {quarterlyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEASON_COLORS[entry.seasonType]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Best Quarter:</span>
                <Badge variant="default">{metrics.peakQuarter}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Slowest Quarter:</span>
                <Badge variant="outline">{metrics.lowQuarter}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Breakdown</CardTitle>
            <CardDescription>Detailed seasonal classification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {monthlyData.map(month => {
                const { label, variant, icon: Icon } = SEASON_BADGES[month.seasonType];
                return (
                  <div 
                    key={month.month}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${SEASON_COLORS[month.seasonType]}20` }}>
                        <Icon className="h-5 w-5" style={{ color: SEASON_COLORS[month.seasonType] }} />
                      </div>
                      <div>
                        <div className="font-medium">{month.monthName}</div>
                        <div className="text-xs text-muted-foreground">
                          {month.avgOrders.toFixed(0)} avg orders
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(month.avgRevenue)}</div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={variant} className="text-xs">{label}</Badge>
                        <span className={`text-xs ${month.percentFromAverage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {month.percentFromAverage >= 0 ? '+' : ''}{month.percentFromAverage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
