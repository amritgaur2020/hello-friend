import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, Line } from "recharts";
import { format, parseISO, getHours } from "date-fns";
import { Clock, TrendingUp, Activity, DollarSign } from "lucide-react";
import { useMemo } from "react";

interface HourlyTrendsContentProps {
  orders: any[];
  currencySymbol: string;
  valueField?: "total_amount" | "count";
  label?: string;
}

export function HourlyTrendsContent({ 
  orders, 
  currencySymbol,
  valueField = "total_amount",
  label = "Sales"
}: HourlyTrendsContentProps) {
  // Generate hourly data for 24 hours
  const hourlyData = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i;
      const ordersInHour = orders.filter(order => {
        const orderDate = parseISO(order.created_at);
        return getHours(orderDate) === hour;
      });
      
      const value = valueField === "total_amount" 
        ? ordersInHour.reduce((sum, o) => sum + (o.total_amount || 0), 0)
        : ordersInHour.length;
      
      return {
        hour: format(new Date().setHours(hour, 0, 0, 0), "ha"),
        hourNum: hour,
        value,
        count: ordersInHour.length,
        avgOrderValue: ordersInHour.length > 0 
          ? ordersInHour.reduce((sum, o) => sum + (o.total_amount || 0), 0) / ordersInHour.length 
          : 0,
      };
    });
  }, [orders, valueField]);

  const peakHour = hourlyData.reduce((max, h) => h.value > max.value ? h : max, hourlyData[0]);
  const totalValue = hourlyData.reduce((sum, h) => sum + h.value, 0);
  const totalOrders = hourlyData.reduce((sum, h) => sum + h.count, 0);
  const avgValue = totalOrders > 0 ? totalValue / totalOrders : 0;
  const activeHours = hourlyData.filter(h => h.count > 0).length;

  // Identify rush hours (top 3 by order count)
  const rushHours = [...hourlyData]
    .filter(h => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(h => h.hour);

  // Time period breakdown
  const periodData = useMemo(() => {
    const periods = [
      { name: 'Morning', hours: [6, 7, 8, 9, 10, 11], color: '#f59e0b' },
      { name: 'Afternoon', hours: [12, 13, 14, 15, 16, 17], color: '#3b82f6' },
      { name: 'Evening', hours: [18, 19, 20, 21, 22, 23], color: '#8b5cf6' },
      { name: 'Night', hours: [0, 1, 2, 3, 4, 5], color: '#64748b' },
    ];

    return periods.map(period => {
      const periodOrders = hourlyData.filter(h => period.hours.includes(h.hourNum));
      return {
        name: period.name,
        orders: periodOrders.reduce((sum, h) => sum + h.count, 0),
        revenue: periodOrders.reduce((sum, h) => sum + h.value, 0),
        color: period.color,
      };
    }).filter(p => p.orders > 0);
  }, [hourlyData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[150px]">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-4 text-sm">
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.dataKey === 'value' || entry.dataKey === 'avgOrderValue' 
                  ? `${currencySymbol}${entry.value.toFixed(2)}`
                  : entry.value
                }
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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Peak Hour</p>
                <p className="text-2xl font-bold text-amber-600">{peakHour.hour}</p>
                <p className="text-xs text-muted-foreground">
                  {peakHour.count} orders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/20">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total {label}</p>
                <p className="text-2xl font-bold text-green-600">
                  {valueField === "total_amount" 
                    ? `${currencySymbol}${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : totalValue
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Avg per Order</p>
                <p className="text-2xl font-bold text-blue-600">
                  {currencySymbol}{avgValue.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active Hours</p>
                <p className="text-2xl font-bold text-purple-600">{activeHours}</p>
                <p className="text-xs text-muted-foreground">of 24 hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rush Hours Indicator */}
      {rushHours.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Rush Hours:</span>
              {rushHours.map((hour, i) => (
                <span 
                  key={i}
                  className="px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                >
                  {hour}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Hourly {label} Trend
          </CardTitle>
          <CardDescription>Combined view of orders and revenue throughout the day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="hour" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                  width={60}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="value" 
                  name="Revenue"
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fill="url(#colorRevenue)" 
                />
                <Bar 
                  yAxisId="right"
                  dataKey="count" 
                  name="Orders"
                  fill="#10b981" 
                  fillOpacity={0.7}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Period Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales by Time Period</CardTitle>
            <CardDescription>Morning, Afternoon, Evening, Night breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                  />
                  <Bar 
                    dataKey="revenue" 
                    name="Revenue"
                    radius={[0, 8, 8, 0]}
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders by Time Period</CardTitle>
            <CardDescription>Order count distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {periodData.map((period, index) => {
                const percentage = totalOrders > 0 ? (period.orders / totalOrders) * 100 : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: period.color }}
                        />
                        <span className="font-medium">{period.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{period.orders}</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: period.color
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Revenue: {currencySymbol}{period.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                );
              })}
              {periodData.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No order data available for this period
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}