import { useMemo } from 'react';
import { DepartmentMenuItem, DepartmentOrderItem, DepartmentInventory, RecipeIngredient } from '@/types/department';
import { calculateIngredientCost } from '@/constants/inventoryUnits';
import { startOfDay, endOfDay } from 'date-fns';

export interface IngredientCostBreakdown {
  category: string;
  totalCost: number;
  percentage: number;
}

export interface PLCostResult {
  totalCOGS: number;
  ingredientBreakdown: IngredientCostBreakdown[];
  recipeBasedItemCount: number;
  estimatedItemCount: number;
  averageCostPerOrder: number;
}

interface UsePLCostCalculationProps {
  orderItems: DepartmentOrderItem[];
  menuItems: DepartmentMenuItem[];
  inventory: DepartmentInventory[];
  filteredOrderIds: Set<string>;
}

export function usePLCostCalculation({
  orderItems,
  menuItems,
  inventory,
  filteredOrderIds,
}: UsePLCostCalculationProps): PLCostResult {
  return useMemo(() => {
    // Create lookup maps
    const menuItemMap = new Map<string, DepartmentMenuItem>();
    menuItems.forEach(item => menuItemMap.set(item.id, item));

    const inventoryMap = new Map<string, DepartmentInventory>();
    inventory.forEach(item => inventoryMap.set(item.id, item));

    // Filter order items to only include those in the date range
    const relevantOrderItems = orderItems.filter(item => filteredOrderIds.has(item.order_id));

    let totalCOGS = 0;
    let recipeBasedItemCount = 0;
    let estimatedItemCount = 0;
    const categoryTotals: Record<string, number> = {};

    relevantOrderItems.forEach(orderItem => {
      const menuItem = orderItem.menu_item_id ? menuItemMap.get(orderItem.menu_item_id) : null;
      
      if (menuItem?.ingredients && Array.isArray(menuItem.ingredients) && menuItem.ingredients.length > 0) {
        // Calculate cost based on recipe with proper unit conversion
        recipeBasedItemCount++;
        const ingredients = menuItem.ingredients as RecipeIngredient[];
        
        ingredients.forEach(ingredient => {
          const inventoryItem = inventoryMap.get(ingredient.inventory_id);
          if (inventoryItem) {
            // Use the calculateIngredientCost function that handles unit conversion
            // Example: recipe says 250g, inventory cost is ₹200/kg
            // This will correctly calculate: (250/1000) * 200 = ₹50
            const ingredientCost = calculateIngredientCost(
              ingredient.quantity || 0,
              ingredient.unit || 'pcs',
              inventoryItem.cost_price || 0,
              inventoryItem.unit || 'pcs'
            ) * orderItem.quantity;
            
            totalCOGS += ingredientCost;

            // Track by category
            const category = inventoryItem.category || 'Other';
            categoryTotals[category] = (categoryTotals[category] || 0) + ingredientCost;
          }
        });
      } else {
        // Fallback: Estimate cost as 30% of selling price for items without recipes
        estimatedItemCount++;
        const estimatedCost = (orderItem.total_price || 0) * 0.30;
        totalCOGS += estimatedCost;
        categoryTotals['Estimated'] = (categoryTotals['Estimated'] || 0) + estimatedCost;
      }
    });

    // Calculate breakdown percentages
    const ingredientBreakdown: IngredientCostBreakdown[] = Object.entries(categoryTotals)
      .map(([category, totalCost]) => ({
        category: category.replace(/_/g, ' '),
        totalCost: Math.round(totalCost * 100) / 100,
        percentage: totalCOGS > 0 ? Math.round((totalCost / totalCOGS) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    const uniqueOrderCount = filteredOrderIds.size || 1;

    return {
      totalCOGS: Math.round(totalCOGS * 100) / 100,
      ingredientBreakdown,
      recipeBasedItemCount,
      estimatedItemCount,
      averageCostPerOrder: Math.round((totalCOGS / uniqueOrderCount) * 100) / 100,
    };
  }, [orderItems, menuItems, inventory, filteredOrderIds]);
}

// Comparison utilities
export interface PLMetrics {
  revenue: number;
  cogs: number;
  grossProfit: number;
  tax: number;
  discount: number;
  netProfit: number;
  profitMargin: number;
  orderCount: number;
}

export interface PLComparison {
  current: PLMetrics;
  previous: PLMetrics;
  changes: {
    revenue: { value: number; percentage: number };
    cogs: { value: number; percentage: number };
    grossProfit: { value: number; percentage: number };
    tax: { value: number; percentage: number };
    netProfit: { value: number; percentage: number };
    profitMargin: { value: number; percentage: number };
    orderCount: { value: number; percentage: number };
  };
}

export function calculatePLMetrics(
  orders: any[],
  totalCOGS: number
): PLMetrics {
  const revenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const tax = orders.reduce((sum, order) => sum + (order.tax_amount || 0), 0);
  const discount = orders.reduce((sum, order) => sum + (order.discount_amount || 0), 0);
  const grossProfit = revenue - totalCOGS;
  const netProfit = grossProfit - tax;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    revenue,
    cogs: totalCOGS,
    grossProfit,
    tax,
    discount,
    netProfit,
    profitMargin,
    orderCount: orders.length,
  };
}

export function comparePLMetrics(current: PLMetrics, previous: PLMetrics): PLComparison {
  const calculateChange = (curr: number, prev: number) => ({
    value: curr - prev,
    percentage: prev !== 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0,
  });

  return {
    current,
    previous,
    changes: {
      revenue: calculateChange(current.revenue, previous.revenue),
      cogs: calculateChange(current.cogs, previous.cogs),
      grossProfit: calculateChange(current.grossProfit, previous.grossProfit),
      tax: calculateChange(current.tax, previous.tax),
      netProfit: calculateChange(current.netProfit, previous.netProfit),
      profitMargin: calculateChange(current.profitMargin, previous.profitMargin),
      orderCount: calculateChange(current.orderCount, previous.orderCount),
    },
  };
}

export function getComparisonPeriodDates(
  startDate: Date,
  endDate: Date,
  comparisonType: 'previous' | 'last_week' | 'last_month' | 'last_year'
): { start: Date; end: Date } {
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  switch (comparisonType) {
    case 'previous': {
      const newEnd = new Date(startDate);
      newEnd.setDate(newEnd.getDate() - 1);
      const newStart = new Date(newEnd);
      newStart.setDate(newStart.getDate() - daysDiff + 1);
      return { start: startOfDay(newStart), end: endOfDay(newEnd) };
    }
    case 'last_week': {
      const newStart = new Date(startDate);
      newStart.setDate(newStart.getDate() - 7);
      const newEnd = new Date(endDate);
      newEnd.setDate(newEnd.getDate() - 7);
      return { start: startOfDay(newStart), end: endOfDay(newEnd) };
    }
    case 'last_month': {
      const newStart = new Date(startDate);
      newStart.setMonth(newStart.getMonth() - 1);
      const newEnd = new Date(endDate);
      newEnd.setMonth(newEnd.getMonth() - 1);
      return { start: startOfDay(newStart), end: endOfDay(newEnd) };
    }
    case 'last_year': {
      const newStart = new Date(startDate);
      newStart.setFullYear(newStart.getFullYear() - 1);
      const newEnd = new Date(endDate);
      newEnd.setFullYear(newEnd.getFullYear() - 1);
      return { start: startOfDay(newStart), end: endOfDay(newEnd) };
    }
    default:
      return { start: startOfDay(startDate), end: endOfDay(endDate) };
  }
}
