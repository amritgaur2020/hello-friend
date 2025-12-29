import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface ConsumptionTransaction {
  id: string;
  inventory_id: string;
  quantity: number;
  transaction_type: string;
  notes: string | null;
  created_at: string;
  reference_id: string | null;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  cost_price: number | null;
}

interface DailyConsumption {
  date: string;
  cost: number;
  itemCount: number;
}

interface TopConsumedItem {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  totalQuantity: number;
  totalCost: number;
}

interface CategoryBreakdown {
  name: string;
  value: number;
}

interface CostMetrics {
  totalIngredientCost: number;
  costPerOrder: number;
  totalTransactions: number;
  uniqueOrders: number;
  avgDailyCost: number;
}

export function useInventoryConsumption(department: 'restaurant' | 'kitchen' = 'restaurant', days: number = 7) {
  const tableName = department === 'restaurant' ? 'restaurant_inventory_transactions' : 'kitchen_inventory_transactions';
  const inventoryTable = department === 'restaurant' ? 'restaurant_inventory' : 'kitchen_inventory';

  const startDate = useMemo(() => subDays(new Date(), days - 1), [days]);

  // Fetch consumption transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: [`${department}-consumption-transactions`, days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('transaction_type', 'consumption')
        .gte('created_at', startOfDay(startDate).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ConsumptionTransaction[];
    },
  });

  // Fetch inventory items for cost and category info
  const { data: inventoryItems = [], isLoading: inventoryLoading } = useQuery({
    queryKey: [`${department}-inventory-for-consumption`],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(inventoryTable)
        .select('id, name, category, unit, cost_price');

      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  // Create inventory lookup map
  const inventoryMap = useMemo(() => {
    return inventoryItems.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {} as Record<string, InventoryItem>);
  }, [inventoryItems]);

  // Calculate daily consumption
  const dailyConsumption = useMemo((): DailyConsumption[] => {
    const dailyMap: Record<string, { cost: number; itemCount: number }> = {};

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      dailyMap[date] = { cost: 0, itemCount: 0 };
    }

    // Aggregate transactions by day
    transactions.forEach((tx) => {
      const date = format(new Date(tx.created_at), 'yyyy-MM-dd');
      const item = inventoryMap[tx.inventory_id];
      const cost = item?.cost_price ? tx.quantity * item.cost_price : 0;

      if (dailyMap[date]) {
        dailyMap[date].cost += cost;
        dailyMap[date].itemCount += 1;
      }
    });

    return Object.entries(dailyMap).map(([date, data]) => ({
      date: format(new Date(date), 'EEE'),
      cost: Math.round(data.cost * 100) / 100,
      itemCount: data.itemCount,
    }));
  }, [transactions, inventoryMap, days]);

  // Calculate top consumed items
  const topConsumedItems = useMemo((): TopConsumedItem[] => {
    const itemMap: Record<string, { totalQuantity: number; totalCost: number }> = {};

    transactions.forEach((tx) => {
      const item = inventoryMap[tx.inventory_id];
      if (!item) return;

      const cost = item.cost_price ? tx.quantity * item.cost_price : 0;

      if (!itemMap[tx.inventory_id]) {
        itemMap[tx.inventory_id] = { totalQuantity: 0, totalCost: 0 };
      }
      itemMap[tx.inventory_id].totalQuantity += tx.quantity;
      itemMap[tx.inventory_id].totalCost += cost;
    });

    return Object.entries(itemMap)
      .map(([id, data]) => {
        const item = inventoryMap[id];
        return {
          id,
          name: item?.name || 'Unknown',
          category: item?.category || null,
          unit: item?.unit || 'pcs',
          totalQuantity: Math.round(data.totalQuantity * 100) / 100,
          totalCost: Math.round(data.totalCost * 100) / 100,
        };
      })
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);
  }, [transactions, inventoryMap]);

  // Calculate category breakdown
  const categoryBreakdown = useMemo((): CategoryBreakdown[] => {
    const categoryMap: Record<string, number> = {};

    transactions.forEach((tx) => {
      const item = inventoryMap[tx.inventory_id];
      if (!item) return;

      const category = item.category || 'Uncategorized';
      const cost = item.cost_price ? tx.quantity * item.cost_price : 0;

      categoryMap[category] = (categoryMap[category] || 0) + cost;
    });

    return Object.entries(categoryMap)
      .map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value: Math.round(value * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, inventoryMap]);

  // Calculate cost metrics
  const costMetrics = useMemo((): CostMetrics => {
    let totalIngredientCost = 0;
    const uniqueOrderIds = new Set<string>();

    transactions.forEach((tx) => {
      const item = inventoryMap[tx.inventory_id];
      const cost = item?.cost_price ? tx.quantity * item.cost_price : 0;
      totalIngredientCost += cost;

      if (tx.reference_id) {
        uniqueOrderIds.add(tx.reference_id);
      }
    });

    const uniqueOrders = uniqueOrderIds.size || 1;
    const avgDailyCost = totalIngredientCost / days;

    return {
      totalIngredientCost: Math.round(totalIngredientCost * 100) / 100,
      costPerOrder: Math.round((totalIngredientCost / uniqueOrders) * 100) / 100,
      totalTransactions: transactions.length,
      uniqueOrders,
      avgDailyCost: Math.round(avgDailyCost * 100) / 100,
    };
  }, [transactions, inventoryMap, days]);

  return {
    dailyConsumption,
    topConsumedItems,
    categoryBreakdown,
    costMetrics,
    isLoading: transactionsLoading || inventoryLoading,
  };
}
