import { addDays, format, getDay, startOfDay, differenceInDays } from 'date-fns';

export interface DailyData {
  date: Date;
  revenue: number;
  cogs: number;
  orders: number;
}

export interface Forecast {
  projectedRevenue: number;
  projectedCOGS: number;
  projectedProfit: number;
  confidence: 'high' | 'medium' | 'low';
  dailyProjections: { date: string; revenue: number; cogs: number; profit: number }[];
  trendDirection: 'up' | 'down' | 'stable';
  growthRate: number;
  dayOfWeekAnalysis: { day: string; avgRevenue: number; avgOrders: number }[];
}

export interface DepartmentForecast {
  department: string;
  currentRevenue: number;
  projectedRevenue: number;
  growthRate: number;
  confidence: 'high' | 'medium' | 'low';
}

// Calculate Simple Moving Average
function calculateMovingAverage(data: number[], period: number): number {
  if (data.length === 0) return 0;
  const slice = data.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / slice.length;
}

// Calculate week-over-week growth rate
function calculateGrowthRate(data: DailyData[]): number {
  if (data.length < 14) return 0;
  
  const lastWeekData = data.slice(-7);
  const previousWeekData = data.slice(-14, -7);
  
  const lastWeekTotal = lastWeekData.reduce((sum, d) => sum + d.revenue, 0);
  const previousWeekTotal = previousWeekData.reduce((sum, d) => sum + d.revenue, 0);
  
  if (previousWeekTotal === 0) return 0;
  return (lastWeekTotal - previousWeekTotal) / previousWeekTotal;
}

// Analyze day-of-week patterns
function analyzeDayOfWeekPatterns(data: DailyData[]): Map<number, { avgRevenue: number; avgOrders: number; count: number }> {
  const dayPatterns = new Map<number, { totalRevenue: number; totalOrders: number; count: number }>();
  
  // Initialize all days
  for (let i = 0; i < 7; i++) {
    dayPatterns.set(i, { totalRevenue: 0, totalOrders: 0, count: 0 });
  }
  
  data.forEach(d => {
    const dayOfWeek = getDay(d.date);
    const current = dayPatterns.get(dayOfWeek)!;
    dayPatterns.set(dayOfWeek, {
      totalRevenue: current.totalRevenue + d.revenue,
      totalOrders: current.totalOrders + d.orders,
      count: current.count + 1,
    });
  });
  
  const result = new Map<number, { avgRevenue: number; avgOrders: number; count: number }>();
  dayPatterns.forEach((value, key) => {
    result.set(key, {
      avgRevenue: value.count > 0 ? value.totalRevenue / value.count : 0,
      avgOrders: value.count > 0 ? value.totalOrders / value.count : 0,
      count: value.count,
    });
  });
  
  return result;
}

// Calculate confidence based on data consistency
function calculateConfidence(data: DailyData[]): 'high' | 'medium' | 'low' {
  if (data.length >= 30) return 'high';
  if (data.length >= 14) return 'medium';
  return 'low';
}

// Calculate trend direction
function calculateTrendDirection(data: DailyData[]): 'up' | 'down' | 'stable' {
  if (data.length < 7) return 'stable';
  
  const recentAvg = calculateMovingAverage(data.slice(-7).map(d => d.revenue), 7);
  const olderAvg = calculateMovingAverage(data.slice(-14, -7).map(d => d.revenue), 7);
  
  if (olderAvg === 0) return 'stable';
  
  const change = (recentAvg - olderAvg) / olderAvg;
  
  if (change > 0.05) return 'up';
  if (change < -0.05) return 'down';
  return 'stable';
}

// Main forecasting function
export function calculateForecast(historicalData: DailyData[], forecastDays: number): Forecast {
  if (historicalData.length === 0) {
    return {
      projectedRevenue: 0,
      projectedCOGS: 0,
      projectedProfit: 0,
      confidence: 'low',
      dailyProjections: [],
      trendDirection: 'stable',
      growthRate: 0,
      dayOfWeekAnalysis: [],
    };
  }

  // Sort data by date
  const sortedData = [...historicalData].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Calculate base metrics
  const avgRevenue = calculateMovingAverage(sortedData.map(d => d.revenue), Math.min(7, sortedData.length));
  const avgCOGS = calculateMovingAverage(sortedData.map(d => d.cogs), Math.min(7, sortedData.length));
  const growthRate = calculateGrowthRate(sortedData);
  const dayPatterns = analyzeDayOfWeekPatterns(sortedData);
  const confidence = calculateConfidence(sortedData);
  const trendDirection = calculateTrendDirection(sortedData);
  
  // Calculate overall average for normalization
  const overallAvgRevenue = sortedData.reduce((sum, d) => sum + d.revenue, 0) / sortedData.length;
  
  // Generate daily projections
  const dailyProjections: { date: string; revenue: number; cogs: number; profit: number }[] = [];
  let totalProjectedRevenue = 0;
  let totalProjectedCOGS = 0;
  
  for (let i = 1; i <= forecastDays; i++) {
    const targetDate = addDays(new Date(), i);
    const dayOfWeek = getDay(targetDate);
    const dayPattern = dayPatterns.get(dayOfWeek);
    
    // Base projection with growth trend
    let baseProjection = avgRevenue * Math.pow(1 + growthRate / 7, i);
    
    // Apply day-of-week multiplier
    if (dayPattern && dayPattern.avgRevenue > 0 && overallAvgRevenue > 0) {
      const dayMultiplier = dayPattern.avgRevenue / overallAvgRevenue;
      baseProjection *= dayMultiplier;
    }
    
    const projectedRevenue = Math.max(0, baseProjection);
    const cogsRatio = avgRevenue > 0 ? avgCOGS / avgRevenue : 0.3;
    const projectedCOGS = projectedRevenue * cogsRatio;
    
    dailyProjections.push({
      date: format(targetDate, 'yyyy-MM-dd'),
      revenue: Math.round(projectedRevenue * 100) / 100,
      cogs: Math.round(projectedCOGS * 100) / 100,
      profit: Math.round((projectedRevenue - projectedCOGS) * 100) / 100,
    });
    
    totalProjectedRevenue += projectedRevenue;
    totalProjectedCOGS += projectedCOGS;
  }
  
  // Day of week analysis
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekAnalysis = dayNames.map((name, index) => ({
    day: name,
    avgRevenue: Math.round((dayPatterns.get(index)?.avgRevenue || 0) * 100) / 100,
    avgOrders: Math.round((dayPatterns.get(index)?.avgOrders || 0) * 100) / 100,
  }));
  
  return {
    projectedRevenue: Math.round(totalProjectedRevenue * 100) / 100,
    projectedCOGS: Math.round(totalProjectedCOGS * 100) / 100,
    projectedProfit: Math.round((totalProjectedRevenue - totalProjectedCOGS) * 100) / 100,
    confidence,
    dailyProjections,
    trendDirection,
    growthRate: Math.round(growthRate * 10000) / 100, // Convert to percentage
    dayOfWeekAnalysis,
  };
}

// Calculate department-specific forecasts
export function calculateDepartmentForecasts(
  departmentData: Map<string, DailyData[]>,
  forecastDays: number
): DepartmentForecast[] {
  const forecasts: DepartmentForecast[] = [];
  
  departmentData.forEach((data, department) => {
    const currentRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const forecast = calculateForecast(data, forecastDays);
    
    forecasts.push({
      department,
      currentRevenue: Math.round(currentRevenue * 100) / 100,
      projectedRevenue: forecast.projectedRevenue,
      growthRate: forecast.growthRate,
      confidence: forecast.confidence,
    });
  });
  
  return forecasts.sort((a, b) => b.projectedRevenue - a.projectedRevenue);
}

// Aggregate daily data from orders
export function aggregateDailyData(
  orders: Array<{ created_at: string; total_amount: number; cogs?: number }>
): DailyData[] {
  const dailyMap = new Map<string, DailyData>();
  
  orders.forEach(order => {
    const dateKey = format(startOfDay(new Date(order.created_at)), 'yyyy-MM-dd');
    const existing = dailyMap.get(dateKey);
    
    if (existing) {
      existing.revenue += order.total_amount || 0;
      existing.cogs += order.cogs || (order.total_amount * 0.3) || 0;
      existing.orders += 1;
    } else {
      dailyMap.set(dateKey, {
        date: startOfDay(new Date(order.created_at)),
        revenue: order.total_amount || 0,
        cogs: order.cogs || (order.total_amount * 0.3) || 0,
        orders: 1,
      });
    }
  });
  
  return Array.from(dailyMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}
