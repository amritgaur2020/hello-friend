import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears, format } from 'date-fns';
import { calculateIngredientCost } from '@/constants/inventoryUnits';
import { RecipeIngredient } from '@/types/department';

export type ComparisonPeriodType = 'month' | 'quarter' | 'year';
export type ComparisonMode = 'yoy' | 'qoq' | 'mom' | 'custom';

export interface PeriodPLData {
  label: string;
  dateRange: { start: Date; end: Date };
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
    margin: number;
    orderCount: number;
  }[];
}

export interface ComparativeVariance {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

export interface ComparativePLResult {
  currentPeriod: PeriodPLData;
  previousPeriod: PeriodPLData;
  variances: ComparativeVariance[];
  departmentVariances: {
    department: string;
    displayName: string;
    revenueChange: number;
    revenueChangePercent: number;
    profitChange: number;
    profitChangePercent: number;
    marginChange: number;
  }[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseComparativePLDataProps {
  comparisonMode: ComparisonMode;
  currentDate?: Date;
  customCurrentRange?: { start: Date; end: Date };
  customPreviousRange?: { start: Date; end: Date };
}

const DEPARTMENT_CONFIG = {
  bar: { displayName: 'Bar' },
  restaurant: { displayName: 'Restaurant' },
  kitchen: { displayName: 'Kitchen' },
  spa: { displayName: 'Spa' },
  frontoffice: { displayName: 'Front Office' },
};

function getPeriodDates(mode: ComparisonMode, baseDate: Date): { current: { start: Date; end: Date }; previous: { start: Date; end: Date }; currentLabel: string; previousLabel: string } {
  switch (mode) {
    case 'yoy': {
      const currentStart = startOfYear(baseDate);
      const currentEnd = endOfYear(baseDate);
      const previousStart = startOfYear(subYears(baseDate, 1));
      const previousEnd = endOfYear(subYears(baseDate, 1));
      return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
        currentLabel: format(currentStart, 'yyyy'),
        previousLabel: format(previousStart, 'yyyy'),
      };
    }
    case 'qoq': {
      const currentStart = startOfQuarter(baseDate);
      const currentEnd = endOfQuarter(baseDate);
      const previousStart = startOfQuarter(subQuarters(baseDate, 1));
      const previousEnd = endOfQuarter(subQuarters(baseDate, 1));
      return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
        currentLabel: `Q${Math.floor(baseDate.getMonth() / 3) + 1} ${format(currentStart, 'yyyy')}`,
        previousLabel: `Q${Math.floor(subQuarters(baseDate, 1).getMonth() / 3) + 1} ${format(previousStart, 'yyyy')}`,
      };
    }
    case 'mom':
    default: {
      const currentStart = startOfMonth(baseDate);
      const currentEnd = endOfMonth(baseDate);
      const previousStart = startOfMonth(subMonths(baseDate, 1));
      const previousEnd = endOfMonth(subMonths(baseDate, 1));
      return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
        currentLabel: format(currentStart, 'MMM yyyy'),
        previousLabel: format(previousStart, 'MMM yyyy'),
      };
    }
  }
}

export function useComparativePLData({
  comparisonMode,
  currentDate = new Date(),
  customCurrentRange,
  customPreviousRange,
}: UseComparativePLDataProps): ComparativePLResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [rawData, setRawData] = useState<{
    currentBarOrders: any[];
    currentRestaurantOrders: any[];
    currentKitchenOrders: any[];
    currentSpaBookings: any[];
    currentBilling: any[];
    previousBarOrders: any[];
    previousRestaurantOrders: any[];
    previousKitchenOrders: any[];
    previousSpaBookings: any[];
    previousBilling: any[];
    barMenu: any[];
    restaurantMenu: any[];
    kitchenMenu: any[];
    barInventory: any[];
    restaurantInventory: any[];
    kitchenInventory: any[];
    barOrderItems: any[];
    restaurantOrderItems: any[];
    kitchenOrderItems: any[];
  } | null>(null);

  const periods = useMemo(() => {
    if (comparisonMode === 'custom' && customCurrentRange && customPreviousRange) {
      return {
        current: customCurrentRange,
        previous: customPreviousRange,
        currentLabel: `${format(customCurrentRange.start, 'MMM d')} - ${format(customCurrentRange.end, 'MMM d, yyyy')}`,
        previousLabel: `${format(customPreviousRange.start, 'MMM d')} - ${format(customPreviousRange.end, 'MMM d, yyyy')}`,
      };
    }
    return getPeriodDates(comparisonMode, currentDate);
  }, [comparisonMode, currentDate, customCurrentRange, customPreviousRange]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentStartISO = startOfDay(periods.current.start).toISOString();
      const currentEndISO = endOfDay(periods.current.end).toISOString();
      const previousStartISO = startOfDay(periods.previous.start).toISOString();
      const previousEndISO = endOfDay(periods.previous.end).toISOString();

      const [
        currentBarOrdersRes,
        currentRestaurantOrdersRes,
        currentKitchenOrdersRes,
        currentSpaBookingsRes,
        currentBillingRes,
        previousBarOrdersRes,
        previousRestaurantOrdersRes,
        previousKitchenOrdersRes,
        previousSpaBookingsRes,
        previousBillingRes,
        barMenuRes,
        restaurantMenuRes,
        kitchenMenuRes,
        barInventoryRes,
        restaurantInventoryRes,
        kitchenInventoryRes,
        barOrderItemsRes,
        restaurantOrderItemsRes,
        kitchenOrderItemsRes,
      ] = await Promise.all([
        // Current period
        supabase.from('bar_orders').select('*').gte('created_at', currentStartISO).lte('created_at', currentEndISO),
        supabase.from('restaurant_orders').select('*').gte('created_at', currentStartISO).lte('created_at', currentEndISO),
        supabase.from('kitchen_orders').select('*').gte('created_at', currentStartISO).lte('created_at', currentEndISO),
        supabase.from('spa_bookings').select('*').gte('created_at', currentStartISO).lte('created_at', currentEndISO).eq('status', 'completed'),
        supabase.from('billing').select('*').gte('created_at', currentStartISO).lte('created_at', currentEndISO),
        // Previous period
        supabase.from('bar_orders').select('*').gte('created_at', previousStartISO).lte('created_at', previousEndISO),
        supabase.from('restaurant_orders').select('*').gte('created_at', previousStartISO).lte('created_at', previousEndISO),
        supabase.from('kitchen_orders').select('*').gte('created_at', previousStartISO).lte('created_at', previousEndISO),
        supabase.from('spa_bookings').select('*').gte('created_at', previousStartISO).lte('created_at', previousEndISO).eq('status', 'completed'),
        supabase.from('billing').select('*').gte('created_at', previousStartISO).lte('created_at', previousEndISO),
        // Menu and inventory for COGS
        supabase.from('bar_menu_items').select('*'),
        supabase.from('restaurant_menu_items').select('*'),
        supabase.from('kitchen_menu_items').select('*'),
        supabase.from('bar_inventory').select('*'),
        supabase.from('restaurant_inventory').select('*'),
        supabase.from('kitchen_inventory').select('*'),
        supabase.from('bar_order_items').select('*'),
        supabase.from('restaurant_order_items').select('*'),
        supabase.from('kitchen_order_items').select('*'),
      ]);

      setRawData({
        currentBarOrders: currentBarOrdersRes.data || [],
        currentRestaurantOrders: currentRestaurantOrdersRes.data || [],
        currentKitchenOrders: currentKitchenOrdersRes.data || [],
        currentSpaBookings: currentSpaBookingsRes.data || [],
        currentBilling: currentBillingRes.data || [],
        previousBarOrders: previousBarOrdersRes.data || [],
        previousRestaurantOrders: previousRestaurantOrdersRes.data || [],
        previousKitchenOrders: previousKitchenOrdersRes.data || [],
        previousSpaBookings: previousSpaBookingsRes.data || [],
        previousBilling: previousBillingRes.data || [],
        barMenu: barMenuRes.data || [],
        restaurantMenu: restaurantMenuRes.data || [],
        kitchenMenu: kitchenMenuRes.data || [],
        barInventory: barInventoryRes.data || [],
        restaurantInventory: restaurantInventoryRes.data || [],
        kitchenInventory: kitchenInventoryRes.data || [],
        barOrderItems: barOrderItemsRes.data || [],
        restaurantOrderItems: restaurantOrderItemsRes.data || [],
        kitchenOrderItems: kitchenOrderItemsRes.data || [],
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periods.current.start.getTime(), periods.previous.start.getTime()]);

  const processedData = useMemo(() => {
    const emptyPeriod: PeriodPLData = {
      label: '',
      dateRange: { start: new Date(), end: new Date() },
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      grossMargin: 0,
      tax: 0,
      netProfit: 0,
      netMargin: 0,
      orderCount: 0,
      avgOrderValue: 0,
      departments: [],
    };

    if (!rawData) {
      return {
        currentPeriod: emptyPeriod,
        previousPeriod: emptyPeriod,
        variances: [],
        departmentVariances: [],
      };
    }

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

    // Calculate department metrics
    const calculateDeptMetrics = (
      orders: any[],
      dept: string,
      orderItems: any[],
      menuItems: any[],
      inventory: any[]
    ) => {
      const config = DEPARTMENT_CONFIG[dept as keyof typeof DEPARTMENT_CONFIG] || { displayName: dept };
      const revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const orderIds = new Set(orders.map(o => o.id));
      const cogs = calculateCOGS(orderItems, menuItems, inventory, orderIds);
      const grossProfit = revenue - cogs;

      return {
        department: dept,
        displayName: config.displayName,
        revenue,
        cogs,
        grossProfit,
        margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        orderCount: orders.length,
      };
    };

    // Calculate period metrics
    const calculatePeriodMetrics = (
      barOrders: any[],
      restaurantOrders: any[],
      kitchenOrders: any[],
      spaBookings: any[],
      billing: any[],
      label: string,
      dateRange: { start: Date; end: Date }
    ): PeriodPLData => {
      const departments = [
        calculateDeptMetrics(barOrders, 'bar', rawData.barOrderItems, rawData.barMenu, rawData.barInventory),
        calculateDeptMetrics(restaurantOrders, 'restaurant', rawData.restaurantOrderItems, rawData.restaurantMenu, rawData.restaurantInventory),
        calculateDeptMetrics(kitchenOrders, 'kitchen', rawData.kitchenOrderItems, rawData.kitchenMenu, rawData.kitchenInventory),
        {
          department: 'spa',
          displayName: 'Spa',
          revenue: spaBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
          cogs: spaBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0) * 0.2,
          grossProfit: spaBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0) * 0.8,
          margin: 80,
          orderCount: spaBookings.length,
        },
        {
          department: 'frontoffice',
          displayName: 'Front Office',
          revenue: billing.reduce((sum, b) => sum + (b.total_amount || 0), 0),
          cogs: 0,
          grossProfit: billing.reduce((sum, b) => sum + (b.total_amount || 0), 0),
          margin: 100,
          orderCount: billing.length,
        },
      ];

      const revenue = departments.reduce((sum, d) => sum + d.revenue, 0);
      const cogs = departments.reduce((sum, d) => sum + d.cogs, 0);
      const grossProfit = revenue - cogs;
      const tax = [...barOrders, ...restaurantOrders, ...kitchenOrders, ...spaBookings].reduce((sum, o) => sum + (o.tax_amount || 0), 0);
      const netProfit = grossProfit - tax;
      const orderCount = departments.reduce((sum, d) => sum + d.orderCount, 0);

      return {
        label,
        dateRange,
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
    };

    const currentPeriod = calculatePeriodMetrics(
      rawData.currentBarOrders,
      rawData.currentRestaurantOrders,
      rawData.currentKitchenOrders,
      rawData.currentSpaBookings,
      rawData.currentBilling,
      periods.currentLabel,
      periods.current
    );

    const previousPeriod = calculatePeriodMetrics(
      rawData.previousBarOrders,
      rawData.previousRestaurantOrders,
      rawData.previousKitchenOrders,
      rawData.previousSpaBookings,
      rawData.previousBilling,
      periods.previousLabel,
      periods.previous
    );

    // Calculate variances
    const calculateVariance = (metric: string, current: number, previous: number, higherIsBetter: boolean = true): ComparativeVariance => {
      const change = current - previous;
      const changePercent = previous !== 0 ? (change / previous) * 100 : current > 0 ? 100 : 0;
      return {
        metric,
        current,
        previous,
        change,
        changePercent,
        isPositive: higherIsBetter ? change >= 0 : change <= 0,
      };
    };

    const variances: ComparativeVariance[] = [
      calculateVariance('Revenue', currentPeriod.revenue, previousPeriod.revenue),
      calculateVariance('Cost of Goods Sold', currentPeriod.cogs, previousPeriod.cogs, false),
      calculateVariance('Gross Profit', currentPeriod.grossProfit, previousPeriod.grossProfit),
      calculateVariance('Gross Margin %', currentPeriod.grossMargin, previousPeriod.grossMargin),
      calculateVariance('Tax', currentPeriod.tax, previousPeriod.tax, false),
      calculateVariance('Net Profit', currentPeriod.netProfit, previousPeriod.netProfit),
      calculateVariance('Net Margin %', currentPeriod.netMargin, previousPeriod.netMargin),
      calculateVariance('Order Count', currentPeriod.orderCount, previousPeriod.orderCount),
      calculateVariance('Avg Order Value', currentPeriod.avgOrderValue, previousPeriod.avgOrderValue),
    ];

    // Calculate department variances
    const departmentVariances = currentPeriod.departments.map(currentDept => {
      const prevDept = previousPeriod.departments.find(d => d.department === currentDept.department) || {
        revenue: 0,
        grossProfit: 0,
        margin: 0,
      };
      const revenueChange = currentDept.revenue - prevDept.revenue;
      const profitChange = currentDept.grossProfit - prevDept.grossProfit;
      
      return {
        department: currentDept.department,
        displayName: currentDept.displayName,
        revenueChange,
        revenueChangePercent: prevDept.revenue !== 0 ? (revenueChange / prevDept.revenue) * 100 : currentDept.revenue > 0 ? 100 : 0,
        profitChange,
        profitChangePercent: prevDept.grossProfit !== 0 ? (profitChange / prevDept.grossProfit) * 100 : currentDept.grossProfit > 0 ? 100 : 0,
        marginChange: currentDept.margin - prevDept.margin,
      };
    });

    return {
      currentPeriod,
      previousPeriod,
      variances,
      departmentVariances,
    };
  }, [rawData, periods]);

  return {
    ...processedData,
    isLoading,
    error,
    refetch: fetchData,
  };
}