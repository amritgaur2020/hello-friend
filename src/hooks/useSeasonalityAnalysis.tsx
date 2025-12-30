import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, getMonth, getQuarter } from 'date-fns';

export interface MonthlySeasonData {
  month: number;
  monthName: string;
  avgRevenue: number;
  avgOrders: number;
  avgProfit: number;
  dataPoints: number;
  seasonType: 'peak' | 'high' | 'normal' | 'low' | 'off-peak';
  percentFromAverage: number;
}

export interface QuarterlySeasonData {
  quarter: number;
  quarterName: string;
  avgRevenue: number;
  avgOrders: number;
  avgProfit: number;
  dataPoints: number;
  seasonType: 'peak' | 'high' | 'normal' | 'low' | 'off-peak';
  percentFromAverage: number;
}

export interface SeasonalityInsight {
  type: 'peak' | 'low' | 'trend' | 'opportunity';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  months?: string[];
}

export interface SeasonalityMetrics {
  peakMonths: string[];
  lowMonths: string[];
  peakQuarter: string;
  lowQuarter: string;
  seasonalityIndex: number; // 0-100, higher means more seasonal variation
  bestMonth: { month: string; avgRevenue: number };
  worstMonth: { month: string; avgRevenue: number };
  yearOverYearGrowth: number;
  predictedNextMonthRevenue: number;
  insights: SeasonalityInsight[];
}

export interface UseSeasonalityAnalysisResult {
  monthlyData: MonthlySeasonData[];
  quarterlyData: QuarterlySeasonData[];
  metrics: SeasonalityMetrics;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseSeasonalityAnalysisProps {
  yearsBack?: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTER_NAMES = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];

export function useSeasonalityAnalysis({
  yearsBack = 2,
}: UseSeasonalityAnalysisProps = {}): UseSeasonalityAnalysisResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [rawMonthlyData, setRawMonthlyData] = useState<Map<number, { revenue: number; orders: number; profit: number; count: number }>>(new Map());

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endDate = endOfMonth(new Date());
      const startDate = startOfMonth(subMonths(endDate, yearsBack * 12));

      // Fetch all orders for the period
      const [barOrdersRes, restaurantOrdersRes, kitchenOrdersRes, spaBookingsRes, billingRes] = await Promise.all([
        supabase.from('bar_orders').select('created_at, total_amount, tax_amount').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()),
        supabase.from('restaurant_orders').select('created_at, total_amount, tax_amount').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()),
        supabase.from('kitchen_orders').select('created_at, total_amount, tax_amount').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()),
        supabase.from('spa_bookings').select('created_at, total_amount').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()).eq('status', 'completed'),
        supabase.from('billing').select('created_at, total_amount').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()),
      ]);

      const allOrders = [
        ...(barOrdersRes.data || []),
        ...(restaurantOrdersRes.data || []),
        ...(kitchenOrdersRes.data || []),
        ...(spaBookingsRes.data || []),
        ...(billingRes.data || []),
      ];

      // Group by month (0-11)
      const monthlyMap = new Map<number, { revenue: number; orders: number; profit: number; count: number }>();
      
      for (let i = 0; i < 12; i++) {
        monthlyMap.set(i, { revenue: 0, orders: 0, profit: 0, count: 0 });
      }

      // Track unique year-months to count data points properly
      const yearMonthSet = new Map<string, Set<number>>();

      allOrders.forEach(order => {
        const date = new Date(order.created_at);
        const month = getMonth(date);
        const yearMonth = format(date, 'yyyy-MM');
        
        if (!yearMonthSet.has(yearMonth)) {
          yearMonthSet.set(yearMonth, new Set());
        }
        yearMonthSet.get(yearMonth)!.add(month);

        const current = monthlyMap.get(month)!;
        const revenue = order.total_amount || 0;
        const tax = (order as any).tax_amount || 0;
        const estimatedCogs = revenue * 0.35;
        const profit = revenue - estimatedCogs - tax;

        monthlyMap.set(month, {
          revenue: current.revenue + revenue,
          orders: current.orders + 1,
          profit: current.profit + profit,
          count: current.count,
        });
      });

      // Count how many times each month appears in the data
      yearMonthSet.forEach((months, yearMonth) => {
        const month = parseInt(yearMonth.split('-')[1]) - 1;
        const current = monthlyMap.get(month)!;
        monthlyMap.set(month, { ...current, count: current.count + 1 });
      });

      setRawMonthlyData(monthlyMap);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [yearsBack]);

  // Process monthly data
  const monthlyData = useMemo((): MonthlySeasonData[] => {
    const totalAvgRevenue = Array.from(rawMonthlyData.values())
      .reduce((sum, d) => sum + (d.count > 0 ? d.revenue / d.count : 0), 0) / 12;

    return Array.from(rawMonthlyData.entries()).map(([month, data]) => {
      const avgRevenue = data.count > 0 ? data.revenue / data.count : 0;
      const avgOrders = data.count > 0 ? data.orders / data.count : 0;
      const avgProfit = data.count > 0 ? data.profit / data.count : 0;
      const percentFromAverage = totalAvgRevenue > 0 ? ((avgRevenue - totalAvgRevenue) / totalAvgRevenue) * 100 : 0;

      let seasonType: 'peak' | 'high' | 'normal' | 'low' | 'off-peak';
      if (percentFromAverage >= 20) seasonType = 'peak';
      else if (percentFromAverage >= 10) seasonType = 'high';
      else if (percentFromAverage >= -10) seasonType = 'normal';
      else if (percentFromAverage >= -20) seasonType = 'low';
      else seasonType = 'off-peak';

      return {
        month,
        monthName: MONTH_NAMES[month],
        avgRevenue,
        avgOrders,
        avgProfit,
        dataPoints: data.count,
        seasonType,
        percentFromAverage,
      };
    }).sort((a, b) => a.month - b.month);
  }, [rawMonthlyData]);

  // Process quarterly data
  const quarterlyData = useMemo((): QuarterlySeasonData[] => {
    const quarters = [0, 1, 2, 3].map(q => {
      const months = monthlyData.filter(m => Math.floor(m.month / 3) === q);
      const avgRevenue = months.reduce((sum, m) => sum + m.avgRevenue, 0);
      const avgOrders = months.reduce((sum, m) => sum + m.avgOrders, 0);
      const avgProfit = months.reduce((sum, m) => sum + m.avgProfit, 0);
      const dataPoints = Math.max(...months.map(m => m.dataPoints), 0);
      return { quarter: q, avgRevenue, avgOrders, avgProfit, dataPoints };
    });

    const totalAvgRevenue = quarters.reduce((sum, q) => sum + q.avgRevenue, 0) / 4;

    return quarters.map(q => {
      const percentFromAverage = totalAvgRevenue > 0 
        ? ((q.avgRevenue - totalAvgRevenue) / totalAvgRevenue) * 100 
        : 0;

      let seasonType: 'peak' | 'high' | 'normal' | 'low' | 'off-peak';
      if (percentFromAverage >= 15) seasonType = 'peak';
      else if (percentFromAverage >= 5) seasonType = 'high';
      else if (percentFromAverage >= -5) seasonType = 'normal';
      else if (percentFromAverage >= -15) seasonType = 'low';
      else seasonType = 'off-peak';

      return {
        quarter: q.quarter,
        quarterName: QUARTER_NAMES[q.quarter],
        avgRevenue: q.avgRevenue,
        avgOrders: q.avgOrders,
        avgProfit: q.avgProfit,
        dataPoints: q.dataPoints,
        seasonType,
        percentFromAverage,
      };
    });
  }, [monthlyData]);

  // Calculate metrics and insights
  const metrics = useMemo((): SeasonalityMetrics => {
    const peakMonths = monthlyData.filter(m => m.seasonType === 'peak' || m.seasonType === 'high').map(m => m.monthName);
    const lowMonths = monthlyData.filter(m => m.seasonType === 'low' || m.seasonType === 'off-peak').map(m => m.monthName);
    
    const sortedByRevenue = [...monthlyData].sort((a, b) => b.avgRevenue - a.avgRevenue);
    const bestMonth = sortedByRevenue[0] ? { month: sortedByRevenue[0].monthName, avgRevenue: sortedByRevenue[0].avgRevenue } : { month: 'N/A', avgRevenue: 0 };
    const worstMonth = sortedByRevenue[sortedByRevenue.length - 1] ? { month: sortedByRevenue[sortedByRevenue.length - 1].monthName, avgRevenue: sortedByRevenue[sortedByRevenue.length - 1].avgRevenue } : { month: 'N/A', avgRevenue: 0 };

    const sortedQuarters = [...quarterlyData].sort((a, b) => b.avgRevenue - a.avgRevenue);
    const peakQuarter = sortedQuarters[0]?.quarterName || 'N/A';
    const lowQuarter = sortedQuarters[sortedQuarters.length - 1]?.quarterName || 'N/A';

    // Seasonality index (coefficient of variation)
    const avgMonthlyRevenue = monthlyData.reduce((sum, m) => sum + m.avgRevenue, 0) / 12;
    const variance = monthlyData.reduce((sum, m) => sum + Math.pow(m.avgRevenue - avgMonthlyRevenue, 2), 0) / 12;
    const stdDev = Math.sqrt(variance);
    const seasonalityIndex = avgMonthlyRevenue > 0 ? Math.min(100, (stdDev / avgMonthlyRevenue) * 100 * 2) : 0;

    // Predict next month revenue based on pattern
    const currentMonth = getMonth(new Date());
    const nextMonth = (currentMonth + 1) % 12;
    const nextMonthData = monthlyData.find(m => m.month === nextMonth);
    const predictedNextMonthRevenue = nextMonthData?.avgRevenue || avgMonthlyRevenue;

    // Generate insights
    const insights: SeasonalityInsight[] = [];

    if (peakMonths.length > 0) {
      insights.push({
        type: 'peak',
        title: 'Peak Season Identified',
        description: `${peakMonths.join(', ')} are your strongest months. Consider increasing inventory and staffing during these periods.`,
        impact: 'high',
        months: peakMonths,
      });
    }

    if (lowMonths.length > 0) {
      insights.push({
        type: 'low',
        title: 'Off-Peak Season Alert',
        description: `${lowMonths.join(', ')} show lower activity. Consider promotional campaigns or special packages to boost revenue.`,
        impact: 'medium',
        months: lowMonths,
      });
    }

    if (seasonalityIndex > 30) {
      insights.push({
        type: 'trend',
        title: 'High Seasonal Variation',
        description: 'Your business shows significant seasonal patterns. Plan cash reserves during peak months to cover low seasons.',
        impact: 'high',
      });
    }

    if (bestMonth.avgRevenue > 0 && worstMonth.avgRevenue > 0) {
      const ratio = bestMonth.avgRevenue / worstMonth.avgRevenue;
      if (ratio > 2) {
        insights.push({
          type: 'opportunity',
          title: 'Revenue Gap Opportunity',
          description: `${bestMonth.month} generates ${ratio.toFixed(1)}x more revenue than ${worstMonth.month}. Analyze what works in ${bestMonth.month} to apply during slower months.`,
          impact: 'medium',
        });
      }
    }

    return {
      peakMonths,
      lowMonths,
      peakQuarter,
      lowQuarter,
      seasonalityIndex,
      bestMonth,
      worstMonth,
      yearOverYearGrowth: 0, // Would need year comparison data
      predictedNextMonthRevenue,
      insights,
    };
  }, [monthlyData, quarterlyData]);

  return {
    monthlyData,
    quarterlyData,
    metrics,
    isLoading,
    error,
    refetch: fetchData,
  };
}
