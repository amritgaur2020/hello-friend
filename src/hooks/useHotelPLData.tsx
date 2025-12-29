import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, format, subDays } from 'date-fns';
import { PLMetrics, calculatePLMetrics, comparePLMetrics, getComparisonPeriodDates, PLComparison } from './usePLCostCalculation';
import { calculateForecast, aggregateDailyData, Forecast, DailyData } from '@/utils/forecastingUtils';

export interface DepartmentPLData {
  department: string;
  displayName: string;
  color: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  margin: number;
  orderCount: number;
  avgOrderValue: number;
  trend: number; // percentage change from previous period
}

export interface InventoryValuation {
  department: string;
  displayName: string;
  totalValue: number;
  itemCount: number;
  lowStockCount: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  department: string;
  currentStock: number;
  minStockLevel: number;
  unit: string;
  percentBelowMin: number;
}

export interface HotelPLSummary {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  totalOrders: number;
  avgOrderValue: number;
}

export interface UseHotelPLDataResult {
  summary: HotelPLSummary;
  departments: DepartmentPLData[];
  inventoryValuation: InventoryValuation[];
  totalInventoryValue: number;
  lowStockItems: LowStockItem[];
  forecast: Forecast;
  departmentDailyData: Map<string, DailyData[]>;
  comparison: PLComparison | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseHotelPLDataProps {
  startDate: Date;
  endDate: Date;
  comparisonType?: 'previous' | 'last_week' | 'last_month' | 'last_year';
  forecastDays?: number;
}

const DEPARTMENT_CONFIG = {
  bar: { displayName: 'Bar', color: 'hsl(var(--chart-1))' },
  restaurant: { displayName: 'Restaurant', color: 'hsl(var(--chart-2))' },
  kitchen: { displayName: 'Kitchen', color: 'hsl(var(--chart-3))' },
  spa: { displayName: 'Spa', color: 'hsl(var(--chart-4))' },
  housekeeping: { displayName: 'Housekeeping', color: 'hsl(var(--chart-5))' },
  rooms: { displayName: 'Room Charges', color: 'hsl(var(--primary))' },
};

export function useHotelPLData({
  startDate,
  endDate,
  comparisonType = 'previous',
  forecastDays = 7,
}: UseHotelPLDataProps): UseHotelPLDataResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [rawData, setRawData] = useState<{
    barOrders: any[];
    restaurantOrders: any[];
    kitchenOrders: any[];
    spaBookings: any[];
    billingItems: any[];
    barInventory: any[];
    restaurantInventory: any[];
    kitchenInventory: any[];
    spaInventory: any[];
    housekeepingInventory: any[];
    previousBarOrders: any[];
    previousRestaurantOrders: any[];
    previousKitchenOrders: any[];
    previousSpaBookings: any[];
  } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const startStr = format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss");
      const endStr = format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss");

      // Get comparison period dates
      const compPeriod = getComparisonPeriodDates(startDate, endDate, comparisonType);
      const compStartStr = format(compPeriod.start, "yyyy-MM-dd'T'HH:mm:ss");
      const compEndStr = format(compPeriod.end, "yyyy-MM-dd'T'HH:mm:ss");

      // Fetch all data in parallel
      const [
        barOrdersRes,
        restaurantOrdersRes,
        kitchenOrdersRes,
        spaBookingsRes,
        billingItemsRes,
        barInventoryRes,
        restaurantInventoryRes,
        kitchenInventoryRes,
        spaInventoryRes,
        housekeepingInventoryRes,
        prevBarOrdersRes,
        prevRestaurantOrdersRes,
        prevKitchenOrdersRes,
        prevSpaBookingsRes,
      ] = await Promise.all([
        // Current period orders
        supabase.from('bar_orders').select('*').gte('created_at', startStr).lte('created_at', endStr),
        supabase.from('restaurant_orders').select('*').gte('created_at', startStr).lte('created_at', endStr),
        supabase.from('kitchen_orders').select('*').gte('created_at', startStr).lte('created_at', endStr),
        supabase.from('spa_bookings').select('*').gte('created_at', startStr).lte('created_at', endStr).eq('status', 'completed'),
        supabase.from('billing_items').select('*, billing!inner(status)').eq('billing.status', 'paid'),
        // Inventory
        supabase.from('bar_inventory').select('*'),
        supabase.from('restaurant_inventory').select('*'),
        supabase.from('kitchen_inventory').select('*'),
        supabase.from('spa_inventory').select('*'),
        supabase.from('housekeeping_inventory').select('*'),
        // Previous period orders for comparison
        supabase.from('bar_orders').select('*').gte('created_at', compStartStr).lte('created_at', compEndStr),
        supabase.from('restaurant_orders').select('*').gte('created_at', compStartStr).lte('created_at', compEndStr),
        supabase.from('kitchen_orders').select('*').gte('created_at', compStartStr).lte('created_at', compEndStr),
        supabase.from('spa_bookings').select('*').gte('created_at', compStartStr).lte('created_at', compEndStr).eq('status', 'completed'),
      ]);

      setRawData({
        barOrders: barOrdersRes.data || [],
        restaurantOrders: restaurantOrdersRes.data || [],
        kitchenOrders: kitchenOrdersRes.data || [],
        spaBookings: spaBookingsRes.data || [],
        billingItems: billingItemsRes.data || [],
        barInventory: barInventoryRes.data || [],
        restaurantInventory: restaurantInventoryRes.data || [],
        kitchenInventory: kitchenInventoryRes.data || [],
        spaInventory: spaInventoryRes.data || [],
        housekeepingInventory: housekeepingInventoryRes.data || [],
        previousBarOrders: prevBarOrdersRes.data || [],
        previousRestaurantOrders: prevRestaurantOrdersRes.data || [],
        previousKitchenOrders: prevKitchenOrdersRes.data || [],
        previousSpaBookings: prevSpaBookingsRes.data || [],
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, comparisonType]);

  // Process data
  const processedData = useMemo(() => {
    if (!rawData) {
      return {
        summary: { totalRevenue: 0, totalCOGS: 0, grossProfit: 0, grossMargin: 0, netProfit: 0, netMargin: 0, totalOrders: 0, avgOrderValue: 0 },
        departments: [],
        inventoryValuation: [],
        totalInventoryValue: 0,
        lowStockItems: [],
        forecast: { projectedRevenue: 0, projectedCOGS: 0, projectedProfit: 0, confidence: 'low' as const, dailyProjections: [], trendDirection: 'stable' as const, growthRate: 0, dayOfWeekAnalysis: [] },
        departmentDailyData: new Map(),
        comparison: null,
      };
    }

    // Calculate department metrics
    const calculateDeptMetrics = (orders: any[], dept: string, prevOrders: any[]): DepartmentPLData => {
      const config = DEPARTMENT_CONFIG[dept as keyof typeof DEPARTMENT_CONFIG] || { displayName: dept, color: 'hsl(var(--muted))' };
      const revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const cogs = revenue * 0.3; // Estimate 30% COGS
      const prevRevenue = prevOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const trend = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

      return {
        department: dept,
        displayName: config.displayName,
        color: config.color,
        revenue,
        cogs,
        grossProfit: revenue - cogs,
        margin: revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0,
        orderCount: orders.length,
        avgOrderValue: orders.length > 0 ? revenue / orders.length : 0,
        trend,
      };
    };

    // Calculate spa metrics from bookings
    const calculateSpaMetrics = (bookings: any[], prevBookings: any[]): DepartmentPLData => {
      const config = DEPARTMENT_CONFIG.spa;
      const revenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const cogs = revenue * 0.2; // Lower COGS for spa services
      const prevRevenue = prevBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const trend = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

      return {
        department: 'spa',
        displayName: config.displayName,
        color: config.color,
        revenue,
        cogs,
        grossProfit: revenue - cogs,
        margin: revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0,
        orderCount: bookings.length,
        avgOrderValue: bookings.length > 0 ? revenue / bookings.length : 0,
        trend,
      };
    };

    // Calculate room charges from billing items
    const calculateRoomMetrics = (billingItems: any[]): DepartmentPLData => {
      const config = DEPARTMENT_CONFIG.rooms;
      const roomItems = billingItems.filter(item => 
        item.item_type === 'room_charge' || item.item_type === 'room' || item.item_type === 'accommodation'
      );
      const revenue = roomItems.reduce((sum, item) => sum + (item.total || item.amount || 0), 0);

      return {
        department: 'rooms',
        displayName: config.displayName,
        color: config.color,
        revenue,
        cogs: 0, // No COGS for room charges
        grossProfit: revenue,
        margin: 100,
        orderCount: roomItems.length,
        avgOrderValue: roomItems.length > 0 ? revenue / roomItems.length : 0,
        trend: 0,
      };
    };

    // Build departments array
    const departments: DepartmentPLData[] = [
      calculateDeptMetrics(rawData.barOrders, 'bar', rawData.previousBarOrders),
      calculateDeptMetrics(rawData.restaurantOrders, 'restaurant', rawData.previousRestaurantOrders),
      calculateDeptMetrics(rawData.kitchenOrders, 'kitchen', rawData.previousKitchenOrders),
      calculateSpaMetrics(rawData.spaBookings, rawData.previousSpaBookings),
      calculateRoomMetrics(rawData.billingItems),
    ].filter(d => d.revenue > 0 || d.orderCount > 0);

    // Calculate inventory valuation
    const calculateInventoryValuation = (inventory: any[], dept: string): InventoryValuation => {
      const config = DEPARTMENT_CONFIG[dept as keyof typeof DEPARTMENT_CONFIG] || { displayName: dept };
      const totalValue = inventory.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.cost_price || 0)), 0);
      const lowStockCount = inventory.filter(item => 
        (item.current_stock || 0) < (item.min_stock_level || 0)
      ).length;

      return {
        department: dept,
        displayName: config.displayName,
        totalValue,
        itemCount: inventory.length,
        lowStockCount,
      };
    };

    const inventoryValuation: InventoryValuation[] = [
      calculateInventoryValuation(rawData.barInventory, 'bar'),
      calculateInventoryValuation(rawData.restaurantInventory, 'restaurant'),
      calculateInventoryValuation(rawData.kitchenInventory, 'kitchen'),
      calculateInventoryValuation(rawData.spaInventory, 'spa'),
      calculateInventoryValuation(rawData.housekeepingInventory, 'housekeeping'),
    ];

    const totalInventoryValue = inventoryValuation.reduce((sum, iv) => sum + iv.totalValue, 0);

    // Collect low stock items
    const collectLowStockItems = (inventory: any[], dept: string): LowStockItem[] => {
      return inventory
        .filter(item => (item.current_stock || 0) < (item.min_stock_level || 0))
        .map(item => ({
          id: item.id,
          name: item.name,
          department: dept,
          currentStock: item.current_stock || 0,
          minStockLevel: item.min_stock_level || 0,
          unit: item.unit || 'pcs',
          percentBelowMin: item.min_stock_level > 0 
            ? ((item.min_stock_level - (item.current_stock || 0)) / item.min_stock_level) * 100 
            : 0,
        }));
    };

    const lowStockItems: LowStockItem[] = [
      ...collectLowStockItems(rawData.barInventory, 'Bar'),
      ...collectLowStockItems(rawData.restaurantInventory, 'Restaurant'),
      ...collectLowStockItems(rawData.kitchenInventory, 'Kitchen'),
      ...collectLowStockItems(rawData.spaInventory, 'Spa'),
      ...collectLowStockItems(rawData.housekeepingInventory, 'Housekeeping'),
    ].sort((a, b) => b.percentBelowMin - a.percentBelowMin);

    // Calculate summary
    const totalRevenue = departments.reduce((sum, d) => sum + d.revenue, 0);
    const totalCOGS = departments.reduce((sum, d) => sum + d.cogs, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const totalOrders = departments.reduce((sum, d) => sum + d.orderCount, 0);

    const summary: HotelPLSummary = {
      totalRevenue,
      totalCOGS,
      grossProfit,
      grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      netProfit: grossProfit * 0.85, // Estimate 15% overhead
      netMargin: totalRevenue > 0 ? ((grossProfit * 0.85) / totalRevenue) * 100 : 0,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };

    // Aggregate daily data for forecasting
    const allOrders = [
      ...rawData.barOrders.map(o => ({ created_at: o.created_at, total_amount: o.total_amount })),
      ...rawData.restaurantOrders.map(o => ({ created_at: o.created_at, total_amount: o.total_amount })),
      ...rawData.kitchenOrders.map(o => ({ created_at: o.created_at, total_amount: o.total_amount })),
      ...rawData.spaBookings.map(b => ({ created_at: b.created_at, total_amount: b.total_amount })),
    ];

    const dailyData = aggregateDailyData(allOrders);
    const forecast = calculateForecast(dailyData, forecastDays);

    // Department daily data for comparison
    const departmentDailyData = new Map<string, DailyData[]>();
    departmentDailyData.set('bar', aggregateDailyData(rawData.barOrders.map(o => ({ created_at: o.created_at, total_amount: o.total_amount }))));
    departmentDailyData.set('restaurant', aggregateDailyData(rawData.restaurantOrders.map(o => ({ created_at: o.created_at, total_amount: o.total_amount }))));
    departmentDailyData.set('kitchen', aggregateDailyData(rawData.kitchenOrders.map(o => ({ created_at: o.created_at, total_amount: o.total_amount }))));
    departmentDailyData.set('spa', aggregateDailyData(rawData.spaBookings.map(b => ({ created_at: b.created_at, total_amount: b.total_amount }))));

    // Calculate comparison
    const currentMetrics: PLMetrics = {
      revenue: totalRevenue,
      cogs: totalCOGS,
      grossProfit,
      tax: totalRevenue * 0.18,
      discount: 0,
      netProfit: summary.netProfit,
      profitMargin: summary.netMargin,
      orderCount: totalOrders,
    };

    const prevTotalRevenue = [
      ...rawData.previousBarOrders,
      ...rawData.previousRestaurantOrders,
      ...rawData.previousKitchenOrders,
      ...rawData.previousSpaBookings,
    ].reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const prevTotalCOGS = prevTotalRevenue * 0.3;
    const prevGrossProfit = prevTotalRevenue - prevTotalCOGS;
    const prevTotalOrders = rawData.previousBarOrders.length + rawData.previousRestaurantOrders.length + 
                           rawData.previousKitchenOrders.length + rawData.previousSpaBookings.length;

    const previousMetrics: PLMetrics = {
      revenue: prevTotalRevenue,
      cogs: prevTotalCOGS,
      grossProfit: prevGrossProfit,
      tax: prevTotalRevenue * 0.18,
      discount: 0,
      netProfit: prevGrossProfit * 0.85,
      profitMargin: prevTotalRevenue > 0 ? ((prevGrossProfit * 0.85) / prevTotalRevenue) * 100 : 0,
      orderCount: prevTotalOrders,
    };

    const comparison = comparePLMetrics(currentMetrics, previousMetrics);

    return {
      summary,
      departments,
      inventoryValuation,
      totalInventoryValue,
      lowStockItems,
      forecast,
      departmentDailyData,
      comparison,
    };
  }, [rawData, forecastDays]);

  return {
    ...processedData,
    isLoading,
    error,
    refetch: fetchData,
  };
}
