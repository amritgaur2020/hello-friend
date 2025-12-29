import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval } from 'date-fns';
import { calculateIngredientCost } from '@/constants/inventoryUnits';
import { RecipeIngredient } from '@/types/department';

export interface MonthlyTrendData {
  month: string;
  monthLabel: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  tax: number;
  netProfit: number;
  netMargin: number;
  orderCount: number;
  avgOrderValue: number;
  departments: {
    department: string;
    displayName: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
    orderCount: number;
  }[];
}

export interface TrendMetrics {
  revenueGrowth: number;
  profitGrowth: number;
  marginTrend: 'improving' | 'declining' | 'stable';
  bestMonth: { month: string; revenue: number } | null;
  worstMonth: { month: string; revenue: number } | null;
  averageMonthlyRevenue: number;
  averageMonthlyProfit: number;
  revenueVolatility: number;
}

export interface UseTrendAnalysisResult {
  monthlyData: MonthlyTrendData[];
  metrics: TrendMetrics;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseTrendAnalysisProps {
  months?: number;
  endDate?: Date;
}

const DEPARTMENT_CONFIG = {
  bar: { displayName: 'Bar' },
  restaurant: { displayName: 'Restaurant' },
  kitchen: { displayName: 'Kitchen' },
  spa: { displayName: 'Spa' },
  frontoffice: { displayName: 'Front Office' },
};

export function useTrendAnalysis({
  months = 6,
  endDate = new Date(),
}: UseTrendAnalysisProps = {}): UseTrendAnalysisResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyTrendData[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate month ranges
      const monthRanges = eachMonthOfInterval({
        start: startOfMonth(subMonths(endDate, months - 1)),
        end: endOfMonth(endDate),
      }).map(date => ({
        start: startOfMonth(date),
        end: endOfMonth(date),
        label: format(date, 'MMM yyyy'),
        key: format(date, 'yyyy-MM'),
      }));

      // Fetch menu items and inventory for COGS calculation (once)
      const [
        barMenuRes,
        restaurantMenuRes,
        kitchenMenuRes,
        barInventoryRes,
        restaurantInventoryRes,
        kitchenInventoryRes,
      ] = await Promise.all([
        supabase.from('bar_menu_items').select('*'),
        supabase.from('restaurant_menu_items').select('*'),
        supabase.from('kitchen_menu_items').select('*'),
        supabase.from('bar_inventory').select('*'),
        supabase.from('restaurant_inventory').select('*'),
        supabase.from('kitchen_inventory').select('*'),
      ]);

      const barMenu = barMenuRes.data || [];
      const restaurantMenu = restaurantMenuRes.data || [];
      const kitchenMenu = kitchenMenuRes.data || [];
      const barInventory = barInventoryRes.data || [];
      const restaurantInventory = restaurantInventoryRes.data || [];
      const kitchenInventory = kitchenInventoryRes.data || [];

      // Fetch all order items for COGS
      const [barOrderItemsRes, restaurantOrderItemsRes, kitchenOrderItemsRes] = await Promise.all([
        supabase.from('bar_order_items').select('*'),
        supabase.from('restaurant_order_items').select('*'),
        supabase.from('kitchen_order_items').select('*'),
      ]);

      const barOrderItems = barOrderItemsRes.data || [];
      const restaurantOrderItems = restaurantOrderItemsRes.data || [];
      const kitchenOrderItems = kitchenOrderItemsRes.data || [];

      // Fetch orders for the entire period
      const overallStart = monthRanges[0].start.toISOString();
      const overallEnd = monthRanges[monthRanges.length - 1].end.toISOString();

      const [
        barOrdersRes,
        restaurantOrdersRes,
        kitchenOrdersRes,
        spaBookingsRes,
        billingRes,
      ] = await Promise.all([
        supabase.from('bar_orders').select('*').gte('created_at', overallStart).lte('created_at', overallEnd),
        supabase.from('restaurant_orders').select('*').gte('created_at', overallStart).lte('created_at', overallEnd),
        supabase.from('kitchen_orders').select('*').gte('created_at', overallStart).lte('created_at', overallEnd),
        supabase.from('spa_bookings').select('*').gte('created_at', overallStart).lte('created_at', overallEnd).eq('status', 'completed'),
        supabase.from('billing').select('*').gte('created_at', overallStart).lte('created_at', overallEnd),
      ]);

      const allBarOrders = barOrdersRes.data || [];
      const allRestaurantOrders = restaurantOrdersRes.data || [];
      const allKitchenOrders = kitchenOrdersRes.data || [];
      const allSpaBookings = spaBookingsRes.data || [];
      const allBilling = billingRes.data || [];

      // Helper to calculate COGS
      const calculateCOGS = (orderItems: any[], menuItems: any[], inventory: any[], orderIds: Set<string>): number => {
        const menuItemMap = new Map(menuItems.map(item => [item.id, item]));
        const inventoryMap = new Map(inventory.map(item => [item.id, item]));
        let totalCOGS = 0;

        const relevantItems = orderItems.filter(item => orderIds.has(item.order_id));
        relevantItems.forEach(orderItem => {
          const menuItem = orderItem.menu_item_id ? menuItemMap.get(orderItem.menu_item_id) : null;
          if (menuItem?.ingredients?.length > 0) {
            (menuItem.ingredients as RecipeIngredient[]).forEach(ingredient => {
              const inventoryItem = inventoryMap.get(ingredient.inventory_id);
              if (inventoryItem) {
                totalCOGS += calculateIngredientCost(
                  ingredient.quantity || 0,
                  ingredient.unit || 'pcs',
                  inventoryItem.cost_price || 0,
                  inventoryItem.unit || 'pcs'
                ) * (orderItem.quantity || 1);
              }
            });
          } else {
            totalCOGS += (orderItem.total_price || 0) * 0.30;
          }
        });
        return Math.round(totalCOGS * 100) / 100;
      };

      // Process each month
      const processedData: MonthlyTrendData[] = monthRanges.map(range => {
        const startISO = range.start.toISOString();
        const endISO = range.end.toISOString();

        // Filter orders by month
        const filterByDate = (orders: any[]) => 
          orders.filter(o => o.created_at >= startISO && o.created_at <= endISO);

        const monthBarOrders = filterByDate(allBarOrders);
        const monthRestaurantOrders = filterByDate(allRestaurantOrders);
        const monthKitchenOrders = filterByDate(allKitchenOrders);
        const monthSpaBookings = filterByDate(allSpaBookings);
        const monthBilling = filterByDate(allBilling);

        // Calculate department metrics
        const calculateDeptMetrics = (orders: any[], dept: string, orderItems: any[], menuItems: any[], inventory: any[]) => {
          const config = DEPARTMENT_CONFIG[dept as keyof typeof DEPARTMENT_CONFIG] || { displayName: dept };
          const revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
          const orderIds = new Set(orders.map(o => o.id));
          const cogs = calculateCOGS(orderItems, menuItems, inventory, orderIds);
          return {
            department: dept,
            displayName: config.displayName,
            revenue,
            cogs,
            grossProfit: revenue - cogs,
            orderCount: orders.length,
          };
        };

        const departments = [
          calculateDeptMetrics(monthBarOrders, 'bar', barOrderItems, barMenu, barInventory),
          calculateDeptMetrics(monthRestaurantOrders, 'restaurant', restaurantOrderItems, restaurantMenu, restaurantInventory),
          calculateDeptMetrics(monthKitchenOrders, 'kitchen', kitchenOrderItems, kitchenMenu, kitchenInventory),
          {
            department: 'spa',
            displayName: 'Spa',
            revenue: monthSpaBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
            cogs: monthSpaBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0) * 0.2,
            grossProfit: monthSpaBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0) * 0.8,
            orderCount: monthSpaBookings.length,
          },
          {
            department: 'frontoffice',
            displayName: 'Front Office',
            revenue: monthBilling.reduce((sum, b) => sum + (b.total_amount || 0), 0),
            cogs: 0,
            grossProfit: monthBilling.reduce((sum, b) => sum + (b.total_amount || 0), 0),
            orderCount: monthBilling.length,
          },
        ];

        const revenue = departments.reduce((sum, d) => sum + d.revenue, 0);
        const cogs = departments.reduce((sum, d) => sum + d.cogs, 0);
        const grossProfit = revenue - cogs;
        const tax = [...monthBarOrders, ...monthRestaurantOrders, ...monthKitchenOrders, ...monthSpaBookings]
          .reduce((sum, o) => sum + (o.tax_amount || 0), 0);
        const netProfit = grossProfit - tax;
        const orderCount = departments.reduce((sum, d) => sum + d.orderCount, 0);

        return {
          month: range.key,
          monthLabel: range.label,
          revenue,
          cogs,
          grossProfit,
          grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
          tax,
          netProfit,
          netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
          orderCount,
          avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
          departments,
        };
      });

      setMonthlyData(processedData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [months, endDate.getMonth(), endDate.getFullYear()]);

  // Calculate trend metrics
  const metrics = useMemo((): TrendMetrics => {
    if (monthlyData.length < 2) {
      return {
        revenueGrowth: 0,
        profitGrowth: 0,
        marginTrend: 'stable',
        bestMonth: null,
        worstMonth: null,
        averageMonthlyRevenue: monthlyData[0]?.revenue || 0,
        averageMonthlyProfit: monthlyData[0]?.netProfit || 0,
        revenueVolatility: 0,
      };
    }

    const first = monthlyData[0];
    const last = monthlyData[monthlyData.length - 1];

    // Growth calculations
    const revenueGrowth = first.revenue > 0 
      ? ((last.revenue - first.revenue) / first.revenue) * 100 
      : last.revenue > 0 ? 100 : 0;
    
    const profitGrowth = first.netProfit > 0 
      ? ((last.netProfit - first.netProfit) / first.netProfit) * 100 
      : last.netProfit > 0 ? 100 : 0;

    // Margin trend
    const marginChange = last.grossMargin - first.grossMargin;
    const marginTrend: 'improving' | 'declining' | 'stable' = 
      marginChange > 2 ? 'improving' : marginChange < -2 ? 'declining' : 'stable';

    // Best and worst months
    const sortedByRevenue = [...monthlyData].sort((a, b) => b.revenue - a.revenue);
    const bestMonth = sortedByRevenue[0] ? { month: sortedByRevenue[0].monthLabel, revenue: sortedByRevenue[0].revenue } : null;
    const worstMonth = sortedByRevenue[sortedByRevenue.length - 1] 
      ? { month: sortedByRevenue[sortedByRevenue.length - 1].monthLabel, revenue: sortedByRevenue[sortedByRevenue.length - 1].revenue }
      : null;

    // Averages
    const averageMonthlyRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0) / monthlyData.length;
    const averageMonthlyProfit = monthlyData.reduce((sum, m) => sum + m.netProfit, 0) / monthlyData.length;

    // Volatility (coefficient of variation)
    const revenueStdDev = Math.sqrt(
      monthlyData.reduce((sum, m) => sum + Math.pow(m.revenue - averageMonthlyRevenue, 2), 0) / monthlyData.length
    );
    const revenueVolatility = averageMonthlyRevenue > 0 ? (revenueStdDev / averageMonthlyRevenue) * 100 : 0;

    return {
      revenueGrowth,
      profitGrowth,
      marginTrend,
      bestMonth,
      worstMonth,
      averageMonthlyRevenue,
      averageMonthlyProfit,
      revenueVolatility,
    };
  }, [monthlyData]);

  return {
    monthlyData,
    metrics,
    isLoading,
    error,
    refetch: fetchData,
  };
}