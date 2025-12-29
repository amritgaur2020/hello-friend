import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, format, subDays } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { PLMetrics, calculatePLMetrics, comparePLMetrics, getComparisonPeriodDates, PLComparison } from './usePLCostCalculation';
import { calculateForecast, aggregateDailyData, Forecast, DailyData } from '@/utils/forecastingUtils';
import { calculateIngredientCost } from '@/constants/inventoryUnits';
import { RecipeIngredient } from '@/types/department';

export interface DepartmentPLData {
  department: string;
  displayName: string;
  color: string;
  revenue: number;
  cogs: number;
  tax: number;
  grossProfit: number;
  netProfit: number;
  margin: number;
  orderCount: number;
  avgOrderValue: number;
  trend: number; // percentage change from previous period
}

export interface FrontOfficeData {
  checkIns: number;
  checkOuts: number;
  revenue: number;
  occupancyRate: number;
  avgStayDuration: number;
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

export interface COGSBreakdownItem {
  menuItemId: string;
  menuItemName: string;
  department: string;
  quantity: number;
  ingredients: {
    name: string;
    inventoryId: string;
    quantityUsed: number;
    unit: string;
    costPerUnit: number;
    totalCost: number;
  }[];
  totalCOGS: number;
  isEstimated: boolean;
}

export interface COGSDebugData {
  department: string;
  displayName: string;
  orderCount: number;
  orderItemCount: number;
  recipeBasedItems: number;
  estimatedItems: number;
  totalCOGS: number;
  breakdown: COGSBreakdownItem[];
}

export interface HotelPLSummary {
  totalRevenue: number;
  totalCOGS: number;
  totalTax: number;
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
  frontOffice: FrontOfficeData;
  cogsDebugData: COGSDebugData[];
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
  frontoffice: { displayName: 'Front Office', color: 'hsl(var(--primary))' },
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
    checkIns: any[];
    billing: any[];
    rooms: any[];
    barInventory: any[];
    restaurantInventory: any[];
    kitchenInventory: any[];
    spaInventory: any[];
    housekeepingInventory: any[];
    barMenu: any[];
    restaurantMenu: any[];
    kitchenMenu: any[];
    barOrderItems: any[];
    restaurantOrderItems: any[];
    kitchenOrderItems: any[];
    previousBarOrders: any[];
    previousRestaurantOrders: any[];
    previousKitchenOrders: any[];
    previousSpaBookings: any[];
  } | null>(null);
  
  const queryClient = useQueryClient();

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
        checkInsRes,
        billingRes,
        roomsRes,
        barInventoryRes,
        restaurantInventoryRes,
        kitchenInventoryRes,
        spaInventoryRes,
        housekeepingInventoryRes,
        barMenuRes,
        restaurantMenuRes,
        kitchenMenuRes,
        barOrderItemsRes,
        restaurantOrderItemsRes,
        kitchenOrderItemsRes,
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
        // Front Office data
        supabase.from('check_ins').select('*, room:rooms(room_number, room_type_id), guest:guests(full_name)').gte('check_in_time', startStr).lte('check_in_time', endStr),
        supabase.from('billing').select('*').gte('created_at', startStr).lte('created_at', endStr),
        supabase.from('rooms').select('*, room_type:room_types(name, base_price)'),
        // Inventory
        supabase.from('bar_inventory').select('*'),
        supabase.from('restaurant_inventory').select('*'),
        supabase.from('kitchen_inventory').select('*'),
        supabase.from('spa_inventory').select('*'),
        supabase.from('housekeeping_inventory').select('*'),
        // Menu items for COGS calculation
        supabase.from('bar_menu_items').select('*'),
        supabase.from('restaurant_menu_items').select('*'),
        supabase.from('kitchen_menu_items').select('*'),
        // Order items for COGS calculation
        supabase.from('bar_order_items').select('*'),
        supabase.from('restaurant_order_items').select('*'),
        supabase.from('kitchen_order_items').select('*'),
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
        checkIns: checkInsRes.data || [],
        billing: billingRes.data || [],
        rooms: roomsRes.data || [],
        barInventory: barInventoryRes.data || [],
        restaurantInventory: restaurantInventoryRes.data || [],
        kitchenInventory: kitchenInventoryRes.data || [],
        spaInventory: spaInventoryRes.data || [],
        housekeepingInventory: housekeepingInventoryRes.data || [],
        barMenu: barMenuRes.data || [],
        restaurantMenu: restaurantMenuRes.data || [],
        kitchenMenu: kitchenMenuRes.data || [],
        barOrderItems: barOrderItemsRes.data || [],
        restaurantOrderItems: restaurantOrderItemsRes.data || [],
        kitchenOrderItems: kitchenOrderItemsRes.data || [],
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

  // Real-time subscriptions for live updates
  useEffect(() => {
    const channels = [
      supabase.channel('pl-bar-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'bar_orders' }, () => fetchData()),
      supabase.channel('pl-restaurant-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_orders' }, () => fetchData()),
      supabase.channel('pl-kitchen-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_orders' }, () => fetchData()),
      supabase.channel('pl-spa-bookings').on('postgres_changes', { event: '*', schema: 'public', table: 'spa_bookings' }, () => fetchData()),
      supabase.channel('pl-check-ins').on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, () => fetchData()),
      supabase.channel('pl-billing').on('postgres_changes', { event: '*', schema: 'public', table: 'billing' }, () => fetchData()),
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  // Process data
  const processedData = useMemo(() => {
    const defaultFrontOffice: FrontOfficeData = { checkIns: 0, checkOuts: 0, revenue: 0, occupancyRate: 0, avgStayDuration: 0 };
    
    if (!rawData) {
      return {
        summary: { totalRevenue: 0, totalCOGS: 0, totalTax: 0, grossProfit: 0, grossMargin: 0, netProfit: 0, netMargin: 0, totalOrders: 0, avgOrderValue: 0 },
        departments: [],
        inventoryValuation: [],
        totalInventoryValue: 0,
        lowStockItems: [],
        forecast: { projectedRevenue: 0, projectedCOGS: 0, projectedProfit: 0, confidence: 'low' as const, dailyProjections: [], trendDirection: 'stable' as const, growthRate: 0, dayOfWeekAnalysis: [] },
        departmentDailyData: new Map(),
        comparison: null,
        frontOffice: defaultFrontOffice,
        cogsDebugData: [],
      };
    }

    // Helper function to calculate COGS from order items using actual recipe costs
    const calculateActualCOGS = (
      orderItems: any[],
      menuItems: any[],
      inventory: any[],
      orderIds: Set<string>
    ): number => {
      const menuItemMap = new Map<string, any>();
      menuItems.forEach(item => menuItemMap.set(item.id, item));

      const inventoryMap = new Map<string, any>();
      inventory.forEach(item => inventoryMap.set(item.id, item));

      let totalCOGS = 0;

      const relevantOrderItems = orderItems.filter(item => orderIds.has(item.order_id));

      relevantOrderItems.forEach(orderItem => {
        const menuItem = orderItem.menu_item_id ? menuItemMap.get(orderItem.menu_item_id) : null;

        if (menuItem?.ingredients && Array.isArray(menuItem.ingredients) && menuItem.ingredients.length > 0) {
          // Calculate cost based on recipe with proper unit conversion
          const ingredients = menuItem.ingredients as RecipeIngredient[];
          
          ingredients.forEach(ingredient => {
            const inventoryItem = inventoryMap.get(ingredient.inventory_id);
            if (inventoryItem) {
              const ingredientCost = calculateIngredientCost(
                ingredient.quantity || 0,
                ingredient.unit || 'pcs',
                inventoryItem.cost_price || 0,
                inventoryItem.unit || 'pcs'
              ) * (orderItem.quantity || 1);
              
              totalCOGS += ingredientCost;
            }
          });
        } else {
          // Fallback: Estimate cost as 30% of selling price for items without recipes
          const estimatedCost = (orderItem.total_price || 0) * 0.30;
          totalCOGS += estimatedCost;
        }
      });

      // Round to 2 decimal places to match Restaurant P/L calculation
      return Math.round(totalCOGS * 100) / 100;
    };

    // Calculate department metrics with actual COGS
    const calculateDeptMetrics = (
      orders: any[], 
      dept: string, 
      prevOrders: any[],
      orderItems: any[],
      menuItems: any[],
      inventory: any[]
    ): DepartmentPLData => {
      const config = DEPARTMENT_CONFIG[dept as keyof typeof DEPARTMENT_CONFIG] || { displayName: dept, color: 'hsl(var(--muted))' };
      const revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const tax = orders.reduce((sum, o) => sum + (o.tax_amount || 0), 0);
      
      // Calculate actual COGS using recipe data
      const orderIds = new Set(orders.map(o => o.id));
      const cogs = calculateActualCOGS(orderItems, menuItems, inventory, orderIds);
      
      const prevRevenue = prevOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const trend = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
      const grossProfit = revenue - cogs;
      const netProfit = grossProfit - tax;

      return {
        department: dept,
        displayName: config.displayName,
        color: config.color,
        revenue,
        cogs,
        tax,
        grossProfit,
        netProfit,
        margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        orderCount: orders.length,
        avgOrderValue: orders.length > 0 ? revenue / orders.length : 0,
        trend,
      };
    };

    // Calculate spa metrics from bookings
    const calculateSpaMetrics = (bookings: any[], prevBookings: any[]): DepartmentPLData => {
      const config = DEPARTMENT_CONFIG.spa;
      const revenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const tax = bookings.reduce((sum, b) => sum + (b.tax_amount || 0), 0);
      const cogs = revenue * 0.2; // Lower COGS for spa services
      const prevRevenue = prevBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const trend = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
      const grossProfit = revenue - cogs;
      const netProfit = grossProfit - tax;

      return {
        department: 'spa',
        displayName: config.displayName,
        color: config.color,
        revenue,
        cogs,
        tax,
        grossProfit,
        netProfit,
        margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        orderCount: bookings.length,
        avgOrderValue: bookings.length > 0 ? revenue / bookings.length : 0,
        trend,
      };
    };

    // Calculate Front Office metrics from check-ins and billing
    const calculateFrontOfficeMetrics = (): { data: FrontOfficeData, deptData: DepartmentPLData } => {
      const config = DEPARTMENT_CONFIG.frontoffice;
      const checkIns = rawData.checkIns.length;
      const checkOuts = rawData.checkIns.filter(ci => ci.actual_check_out || ci.status === 'checked_out').length;
      
      // Calculate revenue from billing (room charges)
      const revenue = rawData.billing.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const tax = rawData.billing.reduce((sum, b) => sum + (b.tax_amount || 0), 0);
      
      // Occupancy rate calculation
      const totalRooms = rawData.rooms.length || 1;
      const occupiedRooms = rawData.checkIns.filter(ci => ci.status === 'checked_in').length;
      const occupancyRate = (occupiedRooms / totalRooms) * 100;
      
      // Average stay duration
      const staysWithDuration = rawData.checkIns.filter(ci => ci.check_in_time && ci.actual_check_out);
      const avgStayDuration = staysWithDuration.length > 0
        ? staysWithDuration.reduce((sum, ci) => {
            const checkIn = new Date(ci.check_in_time);
            const checkOut = new Date(ci.actual_check_out);
            return sum + Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
          }, 0) / staysWithDuration.length
        : 0;
      
      return {
        data: { checkIns, checkOuts, revenue, occupancyRate, avgStayDuration },
        deptData: {
          department: 'frontoffice',
          displayName: config.displayName,
          color: config.color,
          revenue,
          cogs: 0,
          tax,
          grossProfit: revenue,
          netProfit: revenue - tax,
          margin: 100,
          orderCount: checkIns,
          avgOrderValue: checkIns > 0 ? revenue / checkIns : 0,
          trend: 0,
        },
      };
    };
    
    const frontOfficeResult = calculateFrontOfficeMetrics();

    // Build departments array with actual COGS calculation
    const departments: DepartmentPLData[] = [
      calculateDeptMetrics(rawData.barOrders, 'bar', rawData.previousBarOrders, rawData.barOrderItems, rawData.barMenu, rawData.barInventory),
      calculateDeptMetrics(rawData.restaurantOrders, 'restaurant', rawData.previousRestaurantOrders, rawData.restaurantOrderItems, rawData.restaurantMenu, rawData.restaurantInventory),
      calculateDeptMetrics(rawData.kitchenOrders, 'kitchen', rawData.previousKitchenOrders, rawData.kitchenOrderItems, rawData.kitchenMenu, rawData.kitchenInventory),
      calculateSpaMetrics(rawData.spaBookings, rawData.previousSpaBookings),
      frontOfficeResult.deptData,
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

    // Calculate COGS debug data with detailed breakdown
    const calculateCOGSDebug = (
      orders: any[],
      orderItems: any[],
      menuItems: any[],
      inventory: any[],
      dept: string
    ): COGSDebugData => {
      const config = DEPARTMENT_CONFIG[dept as keyof typeof DEPARTMENT_CONFIG] || { displayName: dept };
      const menuItemMap = new Map<string, any>();
      menuItems.forEach(item => menuItemMap.set(item.id, item));
      const inventoryMap = new Map<string, any>();
      inventory.forEach(item => inventoryMap.set(item.id, item));

      const orderIds = new Set(orders.map(o => o.id));
      const relevantOrderItems = orderItems.filter(item => orderIds.has(item.order_id));

      let recipeBasedItems = 0;
      let estimatedItems = 0;
      let totalCOGS = 0;
      const breakdown: COGSBreakdownItem[] = [];

      // Group order items by menu item
      const menuItemGroups = new Map<string, { item: any; orderItems: any[] }>();
      relevantOrderItems.forEach(orderItem => {
        const menuItemId = orderItem.menu_item_id || 'unknown';
        if (!menuItemGroups.has(menuItemId)) {
          menuItemGroups.set(menuItemId, { item: menuItemMap.get(menuItemId), orderItems: [] });
        }
        menuItemGroups.get(menuItemId)!.orderItems.push(orderItem);
      });

      menuItemGroups.forEach((group, menuItemId) => {
        const menuItem = group.item;
        const totalQuantity = group.orderItems.reduce((sum, oi) => sum + (oi.quantity || 1), 0);
        
        if (menuItem?.ingredients && Array.isArray(menuItem.ingredients) && menuItem.ingredients.length > 0) {
          recipeBasedItems += group.orderItems.length;
          const ingredients = menuItem.ingredients as RecipeIngredient[];
          
          const ingredientDetails: COGSBreakdownItem['ingredients'] = [];
          let itemCOGS = 0;

          ingredients.forEach(ingredient => {
            const inventoryItem = inventoryMap.get(ingredient.inventory_id);
            if (inventoryItem) {
              const costPerPortion = calculateIngredientCost(
                ingredient.quantity || 0,
                ingredient.unit || 'pcs',
                inventoryItem.cost_price || 0,
                inventoryItem.unit || 'pcs'
              );
              const totalCost = costPerPortion * totalQuantity;
              itemCOGS += totalCost;

              ingredientDetails.push({
                name: inventoryItem.name,
                inventoryId: ingredient.inventory_id,
                quantityUsed: (ingredient.quantity || 0) * totalQuantity,
                unit: ingredient.unit || 'pcs',
                costPerUnit: inventoryItem.cost_price || 0,
                totalCost: Math.round(totalCost * 100) / 100,
              });
            }
          });

          totalCOGS += itemCOGS;
          breakdown.push({
            menuItemId,
            menuItemName: menuItem?.name || 'Unknown Item',
            department: dept,
            quantity: totalQuantity,
            ingredients: ingredientDetails,
            totalCOGS: Math.round(itemCOGS * 100) / 100,
            isEstimated: false,
          });
        } else {
          estimatedItems += group.orderItems.length;
          const estimatedCost = group.orderItems.reduce((sum, oi) => sum + ((oi.total_price || 0) * 0.30), 0);
          totalCOGS += estimatedCost;
          
          breakdown.push({
            menuItemId,
            menuItemName: menuItem?.name || group.orderItems[0]?.item_name || 'Unknown Item',
            department: dept,
            quantity: totalQuantity,
            ingredients: [],
            totalCOGS: Math.round(estimatedCost * 100) / 100,
            isEstimated: true,
          });
        }
      });

      return {
        department: dept,
        displayName: config.displayName,
        orderCount: orders.length,
        orderItemCount: relevantOrderItems.length,
        recipeBasedItems,
        estimatedItems,
        totalCOGS: Math.round(totalCOGS * 100) / 100,
        breakdown: breakdown.sort((a, b) => b.totalCOGS - a.totalCOGS),
      };
    };

    const cogsDebugData: COGSDebugData[] = [
      calculateCOGSDebug(rawData.barOrders, rawData.barOrderItems, rawData.barMenu, rawData.barInventory, 'bar'),
      calculateCOGSDebug(rawData.restaurantOrders, rawData.restaurantOrderItems, rawData.restaurantMenu, rawData.restaurantInventory, 'restaurant'),
      calculateCOGSDebug(rawData.kitchenOrders, rawData.kitchenOrderItems, rawData.kitchenMenu, rawData.kitchenInventory, 'kitchen'),
    ].filter(d => d.orderCount > 0);

    // Calculate summary with actual tax from departments
    const totalRevenue = departments.reduce((sum, d) => sum + d.revenue, 0);
    const totalCOGS = departments.reduce((sum, d) => sum + d.cogs, 0);
    const totalTax = departments.reduce((sum, d) => sum + d.tax, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalTax;
    const totalOrders = departments.reduce((sum, d) => sum + d.orderCount, 0);

    const summary: HotelPLSummary = {
      totalRevenue,
      totalCOGS,
      grossProfit,
      grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      netProfit,
      netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalTax,
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

    // Calculate comparison using actual values
    const currentMetrics: PLMetrics = {
      revenue: totalRevenue,
      cogs: totalCOGS,
      grossProfit,
      tax: totalTax,
      discount: 0,
      netProfit,
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
      frontOffice: frontOfficeResult.data,
      cogsDebugData,
    };
  }, [rawData, forecastDays]);

  return {
    ...processedData,
    isLoading,
    error,
    refetch: fetchData,
  };
}
