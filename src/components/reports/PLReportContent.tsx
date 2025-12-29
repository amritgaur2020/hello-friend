import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, DollarSign, TrendingUp, TrendingDown, Percent, ArrowUp, ArrowDown, Minus, Package, Star, AlertTriangle, Award, Search, ChefHat, Sparkles, Target, BarChart3, X, Info, Eye } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { 
  usePLCostCalculation, 
  calculatePLMetrics, 
  comparePLMetrics, 
  getComparisonPeriodDates,
  PLComparison
} from "@/hooks/usePLCostCalculation";
import { DepartmentMenuItem, DepartmentOrderItem, DepartmentInventory } from "@/types/department";
import { isWithinInterval, parseISO, format } from "date-fns";
import { calculateIngredientCost, convertIngredientToInventoryUnit } from "@/constants/inventoryUnits";

interface PLReportContentProps {
  orders: any[];
  inventory: DepartmentInventory[];
  currencySymbol: string;
  department: string;
  startDate: Date;
  endDate: Date;
  menuItems?: DepartmentMenuItem[];
  orderItems?: DepartmentOrderItem[];
  allOrders?: any[]; // All orders for comparison period
  allOrderItems?: DepartmentOrderItem[]; // All order items for comparison
  isCompareMode?: boolean;
  comparisonType?: 'previous' | 'last_week' | 'last_month' | 'last_year';
}

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', 
  '#ef4444', '#14b8a6', '#84cc16', '#f97316', '#6366f1'
];

export function PLReportContent({ 
  orders, 
  inventory, 
  currencySymbol, 
  department,
  startDate,
  endDate,
  menuItems = [],
  orderItems = [],
  allOrders = [],
  allOrderItems = [],
  isCompareMode = false,
  comparisonType = 'previous',
}: PLReportContentProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showInsightDetail, setShowInsightDetail] = useState<{type: string; title: string; items?: any[]} | null>(null);

  // Current period calculation
  const filteredOrderIds = useMemo(() => new Set(orders.map(o => o.id)), [orders]);
  
  const costResult = usePLCostCalculation({
    orderItems: orderItems.length > 0 ? orderItems : [],
    menuItems,
    inventory,
    filteredOrderIds,
  });

  // Use recipe-based COGS if we have menu items, otherwise fallback to estimation
  // IMPORTANT: If there are no orders, COGS should be 0 (not based on inventory)
  const hasRecipeData = menuItems.length > 0 && orderItems.length > 0;
  const hasOrders = orders.length > 0;
  const totalCOGS = !hasOrders 
    ? 0 // No orders = no COGS
    : hasRecipeData 
      ? costResult.totalCOGS 
      : orders.reduce((sum, order) => sum + (order.total_amount || 0) * 0.3, 0); // Estimate 30% of revenue if no recipes

  const currentMetrics = calculatePLMetrics(orders, totalCOGS);

  // Calculate detailed ingredient breakdown by category with item details
  const categoryIngredientDetails = useMemo(() => {
    if (!hasRecipeData) return new Map<string, any[]>();
    
    const inventoryMap = new Map(inventory.map(i => [i.id, i]));
    const menuItemMap = new Map(menuItems.map(m => [m.id, m]));
    const filteredItems = orderItems.filter(oi => filteredOrderIds.has(oi.order_id));
    
    const categoryDetails = new Map<string, any[]>();
    
    filteredItems.forEach(orderItem => {
      const menuItem = orderItem.menu_item_id ? menuItemMap.get(orderItem.menu_item_id) : null;
      if (menuItem?.ingredients && Array.isArray(menuItem.ingredients)) {
        menuItem.ingredients.forEach((ing: any) => {
          const invItem = inventoryMap.get(ing.inventory_id);
          if (invItem) {
            const category = invItem.category || 'Estimated';
            const recipeQty = ing.quantity || 0;
            const recipeUnit = ing.unit || 'pcs';
            const invUnit = invItem.unit || 'pcs';
            
            // Calculate cost (already handles unit conversion)
            const cost = calculateIngredientCost(
              recipeQty,
              recipeUnit,
              invItem.cost_price || 0,
              invUnit
            ) * orderItem.quantity;
            
            // Convert quantity to inventory unit for proper display
            const convertedQty = convertIngredientToInventoryUnit(recipeQty, recipeUnit, invUnit);
            const qtyInInventoryUnit = (convertedQty !== null ? convertedQty : recipeQty) * orderItem.quantity;
            
            if (!categoryDetails.has(category)) {
              categoryDetails.set(category, []);
            }
            
            const existing = categoryDetails.get(category)!.find(x => x.id === invItem.id);
            if (existing) {
              existing.totalCost += cost;
              existing.totalQuantity += qtyInInventoryUnit;
              if (!existing.usedIn.includes(menuItem.name)) {
                existing.usedIn.push(menuItem.name);
              }
            } else {
              categoryDetails.get(category)!.push({
                id: invItem.id,
                name: invItem.name,
                unit: invUnit,
                costPrice: invItem.cost_price || 0,
                totalCost: cost,
                totalQuantity: qtyInInventoryUnit,
                usedIn: [menuItem.name],
              });
            }
          }
        });
      }
    });
    
    // Add estimated items
    const estimatedItems: any[] = [];
    filteredItems.forEach(orderItem => {
      const menuItem = orderItem.menu_item_id ? menuItemMap.get(orderItem.menu_item_id) : null;
      if (!menuItem?.ingredients || !Array.isArray(menuItem.ingredients) || menuItem.ingredients.length === 0) {
        const estimatedCost = (orderItem.total_price || 0) * 0.30;
        const existing = estimatedItems.find(x => x.name === (menuItem?.name || 'Unknown Item'));
        if (existing) {
          existing.totalCost += estimatedCost;
          existing.totalQuantity += orderItem.quantity;
        } else {
          estimatedItems.push({
            id: menuItem?.id || 'unknown',
            name: menuItem?.name || 'Unknown Item',
            unit: 'items',
            costPrice: 0,
            totalCost: estimatedCost,
            totalQuantity: orderItem.quantity,
            usedIn: ['No recipe defined'],
            isEstimated: true,
          });
        }
      }
    });
    
    if (estimatedItems.length > 0) {
      categoryDetails.set('Estimated', estimatedItems);
    }
    
    return categoryDetails;
  }, [hasRecipeData, inventory, menuItems, orderItems, filteredOrderIds]);

  // Get profitability data for insights drill-down
  const profitabilityDataForInsights = useMemo(() => {
    const inventoryMap = new Map(inventory.map(i => [i.id, i]));
    const filteredItems = orderItems.filter(oi => filteredOrderIds.has(oi.order_id));
    
    return menuItems.map(menuItem => {
      let recipeCost = 0;
      let hasRecipe = false;
      
      if (menuItem.ingredients && Array.isArray(menuItem.ingredients) && menuItem.ingredients.length > 0) {
        hasRecipe = true;
        menuItem.ingredients.forEach((ingredient: any) => {
          const invItem = inventoryMap.get(ingredient.inventory_id);
          if (invItem) {
            recipeCost += calculateIngredientCost(
              ingredient.quantity || 0,
              ingredient.unit || 'pcs',
              invItem.cost_price || 0,
              invItem.unit || 'pcs'
            );
          }
        });
      } else {
        recipeCost = (menuItem.price || 0) * 0.30;
      }

      const itemOrders = filteredItems.filter(oi => oi.menu_item_id === menuItem.id);
      const totalQuantity = itemOrders.reduce((sum, oi) => sum + oi.quantity, 0);
      const totalRevenue = itemOrders.reduce((sum, oi) => sum + (oi.total_price || 0), 0);
      const totalCost = recipeCost * totalQuantity;
      const profit = totalRevenue - totalCost;
      const marginPercent = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      return {
        id: menuItem.id,
        name: menuItem.name,
        category: menuItem.category || 'Uncategorized',
        price: menuItem.price || 0,
        recipeCost,
        hasRecipe,
        totalQuantity,
        totalRevenue,
        totalCost,
        profit,
        marginPercent,
      };
    }).filter(item => item.totalQuantity > 0);
  }, [menuItems, orderItems, inventory, filteredOrderIds]);

  // Comparison period calculation
  const comparison = useMemo((): PLComparison | null => {
    if (!isCompareMode || allOrders.length === 0) return null;

    const { start: compStart, end: compEnd } = getComparisonPeriodDates(startDate, endDate, comparisonType);
    
    const comparisonOrders = allOrders.filter(order => {
      const orderDate = parseISO(order.created_at || "");
      return isWithinInterval(orderDate, { start: compStart, end: compEnd });
    });

    const comparisonOrderIds = new Set(comparisonOrders.map(o => o.id));
    const comparisonOrderItems = allOrderItems.filter(item => comparisonOrderIds.has(item.order_id));

    // Calculate comparison COGS with proper unit conversion
    let comparisonCOGS = 0;
    if (hasRecipeData) {
      const menuItemMap = new Map(menuItems.map(item => [item.id, item]));
      const inventoryMap = new Map(inventory.map(item => [item.id, item]));

      comparisonOrderItems.forEach(orderItem => {
        const menuItem = orderItem.menu_item_id ? menuItemMap.get(orderItem.menu_item_id) : null;
        if (menuItem?.ingredients && Array.isArray(menuItem.ingredients) && menuItem.ingredients.length > 0) {
          menuItem.ingredients.forEach((ingredient: any) => {
            const inventoryItem = inventoryMap.get(ingredient.inventory_id);
            if (inventoryItem) {
              // Use calculateIngredientCost for proper unit conversion (e.g., g to kg)
              const ingredientCost = calculateIngredientCost(
                ingredient.quantity || 0,
                ingredient.unit || 'pcs',
                inventoryItem.cost_price || 0,
                inventoryItem.unit || 'pcs'
              ) * orderItem.quantity;
              comparisonCOGS += ingredientCost;
            }
          });
        } else {
          comparisonCOGS += (orderItem.total_price || 0) * 0.30;
        }
      });
    } else {
      comparisonCOGS = comparisonOrders.reduce((sum, order) => sum + (order.total_amount || 0) * 0.30, 0);
    }

    const previousMetrics = calculatePLMetrics(comparisonOrders, comparisonCOGS);
    return comparePLMetrics(currentMetrics, previousMetrics);
  }, [isCompareMode, allOrders, allOrderItems, startDate, endDate, comparisonType, currentMetrics, hasRecipeData, menuItems, inventory]);

  const { revenue: totalRevenue, tax: totalTax, discount: totalDiscount, grossProfit, netProfit, profitMargin } = currentMetrics;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${department} P&L Report`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 14, 30);
    doc.text(`COGS Calculation: ${hasRecipeData ? 'Recipe-based' : 'Estimated (30% of revenue)'}`, 14, 36);
    
    const tableData = [
      ["Total Revenue", `${currencySymbol}${totalRevenue.toFixed(2)}`],
      [`Cost of Goods Sold${hasRecipeData ? ' (Recipe-based)' : ' (Estimated)'}`, `${currencySymbol}${totalCOGS.toFixed(2)}`],
      ["Gross Profit", `${currencySymbol}${grossProfit.toFixed(2)}`],
      ["Tax Collected", `${currencySymbol}${totalTax.toFixed(2)}`],
      ["Discounts Given", `${currencySymbol}${totalDiscount.toFixed(2)}`],
      ["Net Profit", `${currencySymbol}${netProfit.toFixed(2)}`],
      ["Profit Margin", `${profitMargin.toFixed(1)}%`],
      ["Order Count", `${currentMetrics.orderCount}`],
    ];

    if (comparison) {
      const changes = [
        comparison.changes.revenue,
        comparison.changes.cogs,
        comparison.changes.grossProfit,
        comparison.changes.tax,
        null,
        comparison.changes.netProfit,
        comparison.changes.profitMargin,
        comparison.changes.orderCount,
      ];
      tableData.forEach((row, i) => {
        const change = changes[i];
        if (change) {
          row.push(`${change.percentage >= 0 ? '+' : ''}${change.percentage.toFixed(1)}%`);
          row.push(`${currencySymbol}${comparison.previous[i === 0 ? 'revenue' : i === 1 ? 'cogs' : i === 2 ? 'grossProfit' : i === 3 ? 'tax' : i === 5 ? 'netProfit' : i === 6 ? 'profitMargin' : 'orderCount'].toFixed(i === 6 || i === 7 ? 0 : 2)}${i === 6 ? '%' : ''}`);
        } else {
          row.push('-', '-');
        }
      });
    }
    
    autoTable(doc, {
      startY: 44,
      head: comparison ? [["Category", "Current", "Change %", "Previous"]] : [["Category", "Amount"]],
      body: tableData,
    });

    // Add comparison period info
    if (comparison) {
      const currentY = (doc as any).lastAutoTable.finalY + 10;
      const compDates = getComparisonPeriodDates(startDate, endDate, comparisonType);
      doc.text(`Comparison Period: ${format(compDates.start, 'MMM dd, yyyy')} - ${format(compDates.end, 'MMM dd, yyyy')}`, 14, currentY);
    }

    if (hasRecipeData && costResult.ingredientBreakdown.length > 0) {
      const currentY = (doc as any).lastAutoTable.finalY + (comparison ? 15 : 10);
      doc.text("COGS Breakdown by Category", 14, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Category", "Cost", "Percentage"]],
        body: costResult.ingredientBreakdown.map(item => [
          item.category,
          `${currencySymbol}${item.totalCost.toFixed(2)}`,
          `${item.percentage.toFixed(1)}%`
        ]),
      });
    }
    
    doc.save(`${department}_PL_Report.pdf`);
  };

  const exportExcel = () => {
    const compDates = comparison ? getComparisonPeriodDates(startDate, endDate, comparisonType) : null;
    
    const data = [
      { 
        Category: "Total Revenue", 
        'Current Amount': totalRevenue, 
        ...(comparison && { 
          'Change %': comparison.changes.revenue.percentage,
          'Previous Amount': comparison.previous.revenue,
        }) 
      },
      { 
        Category: `Cost of Goods Sold${hasRecipeData ? ' (Recipe-based)' : ' (Estimated)'}`, 
        'Current Amount': totalCOGS, 
        ...(comparison && { 
          'Change %': comparison.changes.cogs.percentage,
          'Previous Amount': comparison.previous.cogs,
        }) 
      },
      { 
        Category: "Gross Profit", 
        'Current Amount': grossProfit, 
        ...(comparison && { 
          'Change %': comparison.changes.grossProfit.percentage,
          'Previous Amount': comparison.previous.grossProfit,
        }) 
      },
      { 
        Category: "Tax Collected", 
        'Current Amount': totalTax, 
        ...(comparison && { 
          'Change %': comparison.changes.tax.percentage,
          'Previous Amount': comparison.previous.tax,
        }) 
      },
      { Category: "Discounts Given", 'Current Amount': totalDiscount },
      { 
        Category: "Net Profit", 
        'Current Amount': netProfit, 
        ...(comparison && { 
          'Change %': comparison.changes.netProfit.percentage,
          'Previous Amount': comparison.previous.netProfit,
        }) 
      },
      { 
        Category: "Profit Margin (%)", 
        'Current Amount': profitMargin, 
        ...(comparison && { 
          'Change %': comparison.changes.profitMargin.percentage,
          'Previous Amount': comparison.previous.profitMargin,
        }) 
      },
      { 
        Category: "Order Count", 
        'Current Amount': currentMetrics.orderCount, 
        ...(comparison && { 
          'Change %': comparison.changes.orderCount.percentage,
          'Previous Amount': comparison.previous.orderCount,
        }) 
      },
    ];
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "P&L Report");

    if (hasRecipeData && costResult.ingredientBreakdown.length > 0) {
      const breakdownData = costResult.ingredientBreakdown.map(item => ({
        Category: item.category,
        Cost: item.totalCost,
        Percentage: item.percentage
      }));
      const ws2 = XLSX.utils.json_to_sheet(breakdownData);
      XLSX.utils.book_append_sheet(wb, ws2, "COGS Breakdown");
    }

    // Add period info sheet if comparison mode
    if (comparison && compDates) {
      const periodInfo = [
        { Info: 'Current Period', 'Start Date': format(startDate, 'yyyy-MM-dd'), 'End Date': format(endDate, 'yyyy-MM-dd') },
        { Info: 'Comparison Period', 'Start Date': format(compDates.start, 'yyyy-MM-dd'), 'End Date': format(compDates.end, 'yyyy-MM-dd') },
        { Info: 'Comparison Type', 'Start Date': comparisonType, 'End Date': '' },
      ];
      const ws3 = XLSX.utils.json_to_sheet(periodInfo);
      XLSX.utils.book_append_sheet(wb, ws3, "Period Info");
    }

    XLSX.writeFile(wb, `${department}_PL_Report.xlsx`);
  };

  const renderChangeIndicator = (change: { value: number; percentage: number }, inverse = false, showLabel = false, showAmount = false) => {
    const isPositive = inverse ? change.percentage < 0 : change.percentage > 0;
    const isNeutral = Math.abs(change.percentage) < 0.1;
    
    const formatAmount = (val: number) => {
      const absVal = Math.abs(val);
      if (absVal >= 1000) {
        return `${currencySymbol}${(absVal / 1000).toFixed(1)}k`;
      }
      return `${currencySymbol}${absVal.toFixed(0)}`;
    };
    
    if (isNeutral) {
      return (
        <div className="flex flex-col items-end">
          <Minus className="h-4 w-4 text-muted-foreground" />
          {showLabel && <span className="text-[10px] text-muted-foreground">vs previous</span>}
        </div>
      );
    }
    
    return isPositive ? (
      <div className="flex flex-col items-end">
        <span className="flex items-center text-green-600 text-sm font-medium">
          <ArrowUp className="h-3 w-3" />
          {Math.abs(change.percentage).toFixed(1)}%
        </span>
        {showAmount && (
          <span className="text-[10px] text-green-600/80">
            +{formatAmount(change.value)}
          </span>
        )}
        {showLabel && <span className="text-[10px] text-muted-foreground">vs previous</span>}
      </div>
    ) : (
      <div className="flex flex-col items-end">
        <span className="flex items-center text-red-600 text-sm font-medium">
          <ArrowDown className="h-3 w-3" />
          {Math.abs(change.percentage).toFixed(1)}%
        </span>
        {showAmount && (
          <span className="text-[10px] text-red-600/80">
            -{formatAmount(change.value)}
          </span>
        )}
        {showLabel && <span className="text-[10px] text-muted-foreground">vs previous</span>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {hasRecipeData && (
            <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">
              Recipe-based COGS ({costResult.recipeBasedItemCount} items)
            </span>
          )}
          {costResult.estimatedItemCount > 0 && (
            <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full">
              {costResult.estimatedItemCount} items estimated
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* No Orders Message */}
      {currentMetrics.orderCount === 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-amber-500/20">
                <Info className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-700 dark:text-amber-400">No Orders in Selected Period</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  There are no orders for {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}. 
                  All financial values shown are zero. Try selecting a different date range to view your P&L data.
                </p>
                {comparison && comparison.previous.orderCount > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    The comparison period had {comparison.previous.orderCount} order(s) with {currencySymbol}{comparison.previous.revenue.toFixed(2)} revenue, 
                    which is why you may see change percentages displayed.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold text-green-600">
                    {currencySymbol}{totalRevenue.toFixed(2)}
                  </p>
                </div>
              </div>
              {comparison && renderChangeIndicator(comparison.changes.revenue, false, true, true)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gross Profit</p>
                  <p className="text-xl font-bold text-blue-600">
                    {currencySymbol}{grossProfit.toFixed(2)}
                  </p>
                </div>
              </div>
              {comparison && renderChangeIndicator(comparison.changes.grossProfit, false, true, true)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">COGS</p>
                  <p className="text-xl font-bold text-orange-600">
                    {currencySymbol}{totalCOGS.toFixed(2)}
                  </p>
                </div>
              </div>
              {comparison && renderChangeIndicator(comparison.changes.cogs, true, true, true)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Percent className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profit Margin</p>
                  <p className="text-xl font-bold text-purple-600">
                    {profitMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
              {comparison && renderChangeIndicator(comparison.changes.profitMargin, false, true, false)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Summary */}
      {comparison && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Period Comparison</span>
              {isCompareMode && (
                <span className="text-xs font-normal text-muted-foreground">
                  Comparing to: {format(getComparisonPeriodDates(startDate, endDate, comparisonType).start, 'MMM d')} - {format(getComparisonPeriodDates(startDate, endDate, comparisonType).end, 'MMM d, yyyy')}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Previous Revenue</p>
                <p className="font-semibold">{currencySymbol}{comparison.previous.revenue.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Previous Net Profit</p>
                <p className="font-semibold">{currencySymbol}{comparison.previous.netProfit.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Previous Orders</p>
                <p className="font-semibold">{comparison.previous.orderCount}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Previous Margin</p>
                <p className="font-semibold">{comparison.previous.profitMargin.toFixed(1)}%</p>
              </div>
            </div>
            {comparison.previous.orderCount === 0 && (
              <p className="text-xs text-amber-500 mt-3 text-center">
                No orders found in the comparison period. Try selecting a different date range or comparison type.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comparison Chart */}
      {comparison && comparison.previous.orderCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current vs Previous Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      metric: 'Revenue',
                      current: currentMetrics.revenue,
                      previous: comparison.previous.revenue,
                    },
                    {
                      metric: 'Gross Profit',
                      current: currentMetrics.grossProfit,
                      previous: comparison.previous.grossProfit,
                    },
                    {
                      metric: 'COGS',
                      current: currentMetrics.cogs,
                      previous: comparison.previous.cogs,
                    },
                    {
                      metric: 'Net Profit',
                      current: currentMetrics.netProfit,
                      previous: comparison.previous.netProfit,
                    },
                  ]}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(1)}k`} />
                  <YAxis type="category" dataKey="metric" width={80} />
                  <Tooltip 
                    formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, '']}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="current" name="Current Period" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="previous" name="Previous Period" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-sm text-muted-foreground">Current Period</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-400" />
                <span className="text-sm text-muted-foreground">Previous Period</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced P/L Statement with Profitability Analysis */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Financial Analysis</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Comprehensive P/L statement and profitability insights</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="statement" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="statement" className="text-xs sm:text-sm">
                <FileText className="h-4 w-4 mr-1.5" />
                P/L Statement
              </TabsTrigger>
              <TabsTrigger value="profitability" className="text-xs sm:text-sm">
                <Target className="h-4 w-4 mr-1.5" />
                Item Profitability
              </TabsTrigger>
              <TabsTrigger value="analysis" className="text-xs sm:text-sm">
                <Sparkles className="h-4 w-4 mr-1.5" />
                Insights
              </TabsTrigger>
            </TabsList>

            {/* P/L Statement Tab */}
            <TabsContent value="statement" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: P/L Table */}
                <div className="lg:col-span-2">
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 border-b">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Profit & Loss Statement
                      </h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="font-semibold">Line Item</TableHead>
                          <TableHead className="text-right font-semibold">Amount</TableHead>
                          <TableHead className="text-right font-semibold">% of Revenue</TableHead>
                          {comparison && <TableHead className="text-right font-semibold">Trend</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-green-500/5 transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              Total Revenue
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {currencySymbol}{totalRevenue.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">100%</TableCell>
                          {comparison && (
                            <TableCell className="text-right">
                              {renderChangeIndicator(comparison.changes.revenue)}
                            </TableCell>
                          )}
                        </TableRow>
                        <TableRow className="hover:bg-orange-500/5 transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              Less: Cost of Goods Sold
                              {hasRecipeData && <Badge variant="outline" className="text-[10px] ml-1">Recipe</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            ({currencySymbol}{totalCOGS.toFixed(2)})
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(1) : 0}%
                          </TableCell>
                          {comparison && (
                            <TableCell className="text-right">
                              {renderChangeIndicator(comparison.changes.cogs, true)}
                            </TableCell>
                          )}
                        </TableRow>
                        <TableRow className="bg-blue-500/5">
                          <TableCell className="font-semibold">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              Gross Profit
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-blue-600">
                            {currencySymbol}{grossProfit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-blue-600">
                            {totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0}%
                          </TableCell>
                          {comparison && (
                            <TableCell className="text-right">
                              {renderChangeIndicator(comparison.changes.grossProfit)}
                            </TableCell>
                          )}
                        </TableRow>
                        <TableRow className="hover:bg-red-500/5 transition-colors">
                          <TableCell className="font-medium text-muted-foreground pl-8">
                            Less: Tax Liability
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            ({currencySymbol}{totalTax.toFixed(2)})
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {totalRevenue > 0 ? ((totalTax / totalRevenue) * 100).toFixed(1) : 0}%
                          </TableCell>
                          {comparison && (
                            <TableCell className="text-right">
                              {renderChangeIndicator(comparison.changes.tax, true)}
                            </TableCell>
                          )}
                        </TableRow>
                        <TableRow className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium text-muted-foreground pl-8">
                            Less: Discounts
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            ({currencySymbol}{totalDiscount.toFixed(2)})
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {totalRevenue > 0 ? ((totalDiscount / totalRevenue) * 100).toFixed(1) : 0}%
                          </TableCell>
                          {comparison && <TableCell />}
                        </TableRow>
                        <TableRow className={`border-t-2 ${netProfit >= 0 ? 'bg-gradient-to-r from-green-500/10 to-transparent' : 'bg-gradient-to-r from-red-500/10 to-transparent'}`}>
                          <TableCell className="font-bold text-base">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                              Net Profit
                            </div>
                          </TableCell>
                          <TableCell className={`text-right font-bold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {currencySymbol}{netProfit.toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%
                          </TableCell>
                          {comparison && (
                            <TableCell className="text-right">
                              {renderChangeIndicator(comparison.changes.netProfit)}
                            </TableCell>
                          )}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Right: Visual Summary */}
                <div className="space-y-4">
                  {/* Profit Margin Gauge */}
                  <div className="rounded-xl border bg-gradient-to-br from-card to-muted/20 p-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 text-center">Profit Margin</h4>
                    <div className="h-[100px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart 
                          cx="50%" 
                          cy="100%" 
                          innerRadius="80%" 
                          outerRadius="100%" 
                          barSize={14}
                          data={[{ value: Math.min(100, Math.max(0, profitMargin * 2)), fill: profitMargin >= 20 ? '#22c55e' : profitMargin >= 10 ? '#f59e0b' : '#ef4444' }]}
                          startAngle={180}
                          endAngle={0}
                        >
                          <RadialBar 
                            dataKey="value" 
                            cornerRadius={8}
                            background={{ fill: 'hsl(var(--muted))' }}
                          />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-center -mt-2">
                      <span className={`text-3xl font-bold ${profitMargin >= 20 ? 'text-green-600' : profitMargin >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                        {profitMargin.toFixed(1)}%
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">Net Margin</p>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-3 px-2">
                      <span>0%</span>
                      <span className="text-green-600 font-medium">Target: 20%+</span>
                      <span>50%</span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-card p-3 text-center">
                      <p className="text-xs text-muted-foreground">Avg Order Value</p>
                      <p className="text-lg font-bold text-primary">
                        {currencySymbol}{currentMetrics.orderCount > 0 ? (totalRevenue / currentMetrics.orderCount).toFixed(2) : '0'}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-card p-3 text-center">
                      <p className="text-xs text-muted-foreground">Cost per Order</p>
                      <p className="text-lg font-bold text-orange-600">
                        {currencySymbol}{currentMetrics.orderCount > 0 ? (totalCOGS / currentMetrics.orderCount).toFixed(2) : '0'}
                      </p>
                    </div>
                  </div>

                  {/* Breakdown Mini Chart */}
                  <div className="rounded-xl border bg-card p-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Revenue Breakdown</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>COGS</span>
                          <span className="text-orange-600">{totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(0) : 0}%</span>
                        </div>
                        <Progress value={totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 0} className="h-2 bg-muted" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Gross Profit</span>
                          <span className="text-blue-600">{totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(0) : 0}%</span>
                        </div>
                        <Progress value={totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0} className="h-2 bg-muted [&>div]:bg-blue-500" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Net Profit</span>
                          <span className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                        <Progress value={totalRevenue > 0 ? Math.max(0, (netProfit / totalRevenue) * 100) : 0} className="h-2 bg-muted [&>div]:bg-green-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Item Profitability Tab */}
            <TabsContent value="profitability" className="mt-0">
              <MenuItemProfitabilitySection 
                menuItems={menuItems}
                orderItems={orderItems}
                inventory={inventory}
                currencySymbol={currencySymbol}
                filteredOrderIds={filteredOrderIds}
              />
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="analysis" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Insights */}
                <div className="space-y-4">
                  <div className="rounded-xl border bg-gradient-to-br from-card to-muted/10 p-5">
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-4">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Key Insights
                    </h4>
                    <div className="space-y-3">
                      <ClickableInsightCard 
                        type={profitMargin >= 20 ? 'success' : profitMargin >= 10 ? 'warning' : 'danger'}
                        title="Profit Margin"
                        description={
                          profitMargin >= 20 
                            ? "Excellent! Your profit margin is above industry standard."
                            : profitMargin >= 10 
                            ? "Good, but there's room for improvement. Consider optimizing costs."
                            : "Low margin detected. Review pricing and COGS."
                        }
                        onClick={() => setShowInsightDetail({
                          type: 'margin',
                          title: 'Profit Margin Analysis',
                          items: profitabilityDataForInsights.sort((a, b) => b.marginPercent - a.marginPercent)
                        })}
                      />
                      <ClickableInsightCard 
                        type={totalCOGS / totalRevenue <= 0.35 ? 'success' : totalCOGS / totalRevenue <= 0.45 ? 'warning' : 'danger'}
                        title="Cost Efficiency"
                        description={
                          totalCOGS / totalRevenue <= 0.35 
                            ? "COGS is well controlled at " + ((totalCOGS / totalRevenue) * 100).toFixed(0) + "% of revenue."
                            : totalCOGS / totalRevenue <= 0.45 
                            ? "COGS at " + ((totalCOGS / totalRevenue) * 100).toFixed(0) + "% - consider negotiating with suppliers."
                            : "High COGS at " + ((totalCOGS / totalRevenue) * 100).toFixed(0) + "% - immediate attention needed."
                        }
                        onClick={() => setShowInsightDetail({
                          type: 'cogs',
                          title: 'Cost Efficiency Analysis',
                          items: profitabilityDataForInsights.sort((a, b) => (b.recipeCost / b.price) - (a.recipeCost / a.price))
                        })}
                      />
                      {currentMetrics.orderCount > 0 && (
                        <ClickableInsightCard 
                          type="info"
                          title="Order Performance"
                          description={`${currentMetrics.orderCount} orders with avg value of ${currencySymbol}${(totalRevenue / currentMetrics.orderCount).toFixed(2)}`}
                          onClick={() => setShowInsightDetail({
                            type: 'orders',
                            title: 'Order Performance Analysis',
                            items: profitabilityDataForInsights.sort((a, b) => b.totalQuantity - a.totalQuantity)
                          })}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-4">
                  <div className="rounded-xl border bg-gradient-to-br from-card to-muted/10 p-5">
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-4">
                      <Target className="h-4 w-4 text-blue-500" />
                      Recommendations
                    </h4>
                    <div className="space-y-3">
                      {profitMargin < 20 && (
                        <ClickableRecommendationCard 
                          priority="high"
                          title="Increase Profit Margin"
                          action="Review menu pricing or reduce ingredient costs"
                          onClick={() => setShowInsightDetail({
                            type: 'low-margin',
                            title: 'Low Margin Items',
                            items: profitabilityDataForInsights.filter(i => i.marginPercent < 30).sort((a, b) => a.marginPercent - b.marginPercent)
                          })}
                        />
                      )}
                      {totalCOGS / totalRevenue > 0.40 && (
                        <ClickableRecommendationCard 
                          priority="medium"
                          title="Optimize COGS"
                          action="Negotiate bulk pricing with suppliers"
                          onClick={() => setShowInsightDetail({
                            type: 'high-cost',
                            title: 'High Cost Items',
                            items: profitabilityDataForInsights.filter(i => (i.recipeCost / i.price) > 0.40).sort((a, b) => (b.recipeCost / b.price) - (a.recipeCost / a.price))
                          })}
                        />
                      )}
                      {!hasRecipeData && (
                        <ClickableRecommendationCard 
                          priority="low"
                          title="Add Recipe Data"
                          action="Define recipes for accurate COGS tracking"
                          onClick={() => {}}
                        />
                      )}
                      {hasRecipeData && costResult.estimatedItemCount > 0 && (
                        <ClickableRecommendationCard 
                          priority="medium"
                          title="Complete Recipes"
                          action={`${costResult.estimatedItemCount} items missing recipes`}
                          onClick={() => setShowInsightDetail({
                            type: 'no-recipe',
                            title: 'Items Without Recipes',
                            items: profitabilityDataForInsights.filter(i => !i.hasRecipe)
                          })}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* COGS Breakdown - Enhanced View */}
      {hasRecipeData && costResult.ingredientBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              COGS Breakdown by Category
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Detailed cost analysis based on recipe ingredients
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Horizontal Bar Chart */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Cost Distribution</h4>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={costResult.ingredientBreakdown}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                      <XAxis 
                        type="number" 
                        tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0)}`}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="category" 
                        width={100}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickFormatter={(v) => v.length > 12 ? `${v.slice(0, 12)}...` : v}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Cost']}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="totalCost" 
                        radius={[0, 6, 6, 0]}
                        maxBarSize={30}
                      >
                        {costResult.ingredientBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Donut Chart with Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Percentage Breakdown</h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costResult.ingredientBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="totalCost"
                        nameKey="category"
                      >
                        {costResult.ingredientBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string, entry: any) => [
                          `${currencySymbol}${value.toFixed(2)} (${entry.payload.percentage.toFixed(1)}%)`, 
                          entry.payload.category
                        ]}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Detailed Legend - Clickable */}
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                  {costResult.ingredientBreakdown.map((item, index) => (
                    <button 
                      key={item.category} 
                      onClick={() => setSelectedCategory(item.category)}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group text-left"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                        />
                        <span className="text-sm font-medium truncate">{item.category}</span>
                        <Eye className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {currencySymbol}{item.totalCost.toFixed(2)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {item.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Click on a category to see ingredient details
                </p>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
              <div className="text-center p-3 rounded-lg bg-orange-500/10">
                <p className="text-xs text-muted-foreground mb-1">Total COGS</p>
                <p className="text-lg font-bold text-orange-600">{currencySymbol}{totalCOGS.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-500/10">
                <p className="text-xs text-muted-foreground mb-1">Categories</p>
                <p className="text-lg font-bold text-blue-600">{costResult.ingredientBreakdown.length}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <p className="text-xs text-muted-foreground mb-1">Recipe Items</p>
                <p className="text-lg font-bold text-green-600">{costResult.recipeBasedItemCount}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-500/10">
                <p className="text-xs text-muted-foreground mb-1">COGS %</p>
                <p className="text-lg font-bold text-purple-600">
                  {totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Category Detail Modal */}
      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              {selectedCategory} - Ingredient Details
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {selectedCategory && categoryIngredientDetails.get(selectedCategory)?.map((item, index) => (
                <div key={item.id + index} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{item.name}</p>
                      {item.isEstimated && (
                        <Badge variant="outline" className="text-[10px] mt-1">Estimated (30% of price)</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{currencySymbol}{item.totalCost.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Total Cost</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs mt-3 pt-3 border-t">
                    <div>
                      <p className="text-muted-foreground">Quantity Used</p>
                      <p className="font-medium">{item.totalQuantity.toFixed(2)} {item.unit}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Unit Cost</p>
                      <p className="font-medium">{currencySymbol}{item.costPrice.toFixed(2)}/{item.unit}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Used in menu items:</p>
                    <div className="flex flex-wrap gap-1">
                      {item.usedIn.slice(0, 5).map((menuName: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{menuName}</Badge>
                      ))}
                      {item.usedIn.length > 5 && (
                        <Badge variant="outline" className="text-[10px]">+{item.usedIn.length - 5} more</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {selectedCategory && (!categoryIngredientDetails.get(selectedCategory) || categoryIngredientDetails.get(selectedCategory)?.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No ingredient details available for this category</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Insight Detail Modal */}
      <Dialog open={!!showInsightDetail} onOpenChange={() => setShowInsightDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              {showInsightDetail?.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {showInsightDetail?.items && showInsightDetail.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Recipe Cost</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showInsightDetail.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{currencySymbol}{item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {currencySymbol}{item.recipeCost.toFixed(2)}
                          {!item.hasRecipe && <Badge variant="outline" className="text-[9px] ml-1">Est</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.totalQuantity}</TableCell>
                      <TableCell className="text-right font-medium">{currencySymbol}{item.totalRevenue.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={item.marginPercent >= 50 ? 'default' : item.marginPercent >= 30 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {item.marginPercent.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No items to display</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper Components
function InsightCard({ type, title, description }: { type: 'success' | 'warning' | 'danger' | 'info'; title: string; description: string }) {
  const styles = {
    success: 'border-green-500/30 bg-green-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    danger: 'border-red-500/30 bg-red-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
  };
  const icons = {
    success: <TrendingUp className="h-4 w-4 text-green-600" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    danger: <TrendingDown className="h-4 w-4 text-red-600" />,
    info: <Award className="h-4 w-4 text-blue-600" />,
  };

  return (
    <div className={`rounded-lg border p-3 ${styles[type]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icons[type]}</div>
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ priority, title, action }: { priority: 'high' | 'medium' | 'low'; title: string; action: string }) {
  const priorityStyles = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  };

  return (
    <div className="rounded-lg border bg-card p-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-1.5 ${priorityStyles[priority]}`} />
        <div className="flex-1">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{action}</p>
        </div>
        <Badge variant="outline" className="text-[10px] capitalize">{priority}</Badge>
      </div>
    </div>
  );
}

// Clickable Insight Card
function ClickableInsightCard({ type, title, description, onClick }: { type: 'success' | 'warning' | 'danger' | 'info'; title: string; description: string; onClick: () => void }) {
  const styles = {
    success: 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10',
    warning: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10',
    danger: 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10',
    info: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10',
  };
  const icons = {
    success: <TrendingUp className="h-4 w-4 text-green-600" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    danger: <TrendingDown className="h-4 w-4 text-red-600" />,
    info: <Award className="h-4 w-4 text-blue-600" />,
  };

  return (
    <button 
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 ${styles[type]} transition-colors cursor-pointer group`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icons[type]}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{title}</p>
            <Eye className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  );
}

// Clickable Recommendation Card
function ClickableRecommendationCard({ priority, title, action, onClick }: { priority: 'high' | 'medium' | 'low'; title: string; action: string; onClick: () => void }) {
  const priorityStyles = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  };

  return (
    <button 
      onClick={onClick}
      className="w-full text-left rounded-lg border bg-card p-3 hover:bg-muted/30 transition-colors cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-1.5 ${priorityStyles[priority]}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{title}</p>
            <Eye className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{action}</p>
        </div>
        <Badge variant="outline" className="text-[10px] capitalize">{priority}</Badge>
      </div>
    </button>
  );
}

// Menu Item Profitability Component
function MenuItemProfitabilitySection({ 
  menuItems, 
  orderItems, 
  inventory, 
  currencySymbol,
  filteredOrderIds
}: { 
  menuItems: DepartmentMenuItem[];
  orderItems: DepartmentOrderItem[];
  inventory: DepartmentInventory[];
  currencySymbol: string;
  filteredOrderIds: Set<string>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'margin' | 'revenue' | 'quantity'>('margin');

  const inventoryMap = useMemo(() => new Map(inventory.map(i => [i.id, i])), [inventory]);

  const profitabilityData = useMemo(() => {
    const filteredOrderItems = orderItems.filter(item => filteredOrderIds.has(item.order_id));
    
    return menuItems.map(menuItem => {
      // Calculate recipe cost
      let recipeCost = 0;
      let hasRecipe = false;
      
      if (menuItem.ingredients && Array.isArray(menuItem.ingredients) && menuItem.ingredients.length > 0) {
        hasRecipe = true;
        menuItem.ingredients.forEach((ingredient: any) => {
          const invItem = inventoryMap.get(ingredient.inventory_id);
          if (invItem) {
            const cost = calculateIngredientCost(
              ingredient.quantity || 0,
              ingredient.unit || 'pcs',
              invItem.cost_price || 0,
              invItem.unit || 'pcs'
            );
            recipeCost += cost;
          }
        });
      } else {
        recipeCost = (menuItem.price || 0) * 0.30;
      }

      // Calculate sales data
      const itemOrders = filteredOrderItems.filter(oi => oi.menu_item_id === menuItem.id);
      const totalQuantity = itemOrders.reduce((sum, oi) => sum + oi.quantity, 0);
      const totalRevenue = itemOrders.reduce((sum, oi) => sum + (oi.total_price || 0), 0);
      const totalCost = recipeCost * totalQuantity;
      const profit = totalRevenue - totalCost;
      const marginPercent = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
      const unitMargin = (menuItem.price || 0) - recipeCost;

      return {
        id: menuItem.id,
        name: menuItem.name,
        category: menuItem.category || 'Uncategorized',
        price: menuItem.price || 0,
        recipeCost,
        hasRecipe,
        totalQuantity,
        totalRevenue,
        totalCost,
        profit,
        marginPercent,
        unitMargin,
      };
    }).filter(item => item.totalQuantity > 0);
  }, [menuItems, orderItems, inventory, filteredOrderIds, inventoryMap]);

  const sortedData = useMemo(() => {
    const filtered = profitabilityData.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'margin': return b.marginPercent - a.marginPercent;
        case 'revenue': return b.totalRevenue - a.totalRevenue;
        case 'quantity': return b.totalQuantity - a.totalQuantity;
        default: return 0;
      }
    });
  }, [profitabilityData, searchTerm, sortBy]);

  const topPerformers = sortedData.filter(i => i.marginPercent >= 50).slice(0, 5);
  const needsAttention = sortedData.filter(i => i.marginPercent < 30 && i.marginPercent > 0).slice(0, 5);
  const avgMargin = sortedData.length > 0 
    ? sortedData.reduce((sum, i) => sum + i.marginPercent, 0) / sortedData.length 
    : 0;

  if (menuItems.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No Menu Items Found</p>
        <p className="text-sm">Add menu items with recipes to see profitability analysis</p>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No Sales Data</p>
        <p className="text-sm">No orders found in the selected period</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-gradient-to-br from-green-500/10 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Star className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Top Performers</p>
              <p className="text-xl font-bold text-green-600">{topPerformers.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-amber-500/10 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Needs Attention</p>
              <p className="text-xl font-bold text-amber-600">{needsAttention.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-blue-500/10 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Percent className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Margin</p>
              <p className="text-xl font-bold text-blue-600">{avgMargin.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-purple-500/10 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Package className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Items Sold</p>
              <p className="text-xl font-bold text-purple-600">{sortedData.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 by Margin */}
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-green-500" />
            Top 10 by Profit Margin
          </h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...sortedData].sort((a, b) => b.marginPercent - a.marginPercent).slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={11} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100}
                  fontSize={10}
                  tickFormatter={(v) => v.length > 14 ? `${v.slice(0, 14)}...` : v}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margin']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="marginPercent" 
                  radius={[0, 6, 6, 0]}
                  maxBarSize={24}
                >
                  {[...sortedData].sort((a, b) => b.marginPercent - a.marginPercent).slice(0, 10).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.marginPercent >= 50 ? '#22c55e' : entry.marginPercent >= 30 ? '#f59e0b' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue vs Profit Scatter */}
        <div className="rounded-xl border bg-card p-4">
          <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Top 10 by Revenue
          </h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...sortedData].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                <XAxis 
                  type="number" 
                  tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                  fontSize={11}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100}
                  fontSize={10}
                  tickFormatter={(v) => v.length > 14 ? `${v.slice(0, 14)}...` : v}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${currencySymbol}${value.toFixed(2)}`, 
                    name === 'totalRevenue' ? 'Revenue' : 'Profit'
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="totalRevenue" name="Revenue" fill="#3b82f6" radius={[0, 6, 6, 0]} maxBarSize={16} />
                <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[0, 6, 6, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-primary" />
            All Items Profitability
          </h4>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm w-full sm:w-48"
              />
            </div>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8 px-2 text-sm border rounded-md bg-background"
            >
              <option value="margin">Sort by Margin</option>
              <option value="revenue">Sort by Revenue</option>
              <option value="quantity">Sort by Quantity</option>
            </select>
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="sticky left-0 bg-muted/30">Item</TableHead>
                <TableHead className="text-center">Qty Sold</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Recipe Cost</TableHead>
                <TableHead className="text-right">Unit Margin</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-center">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="sticky left-0 bg-background">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                        {!item.hasRecipe && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-300">Est</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">{item.totalQuantity}</TableCell>
                  <TableCell className="text-right">{currencySymbol}{item.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-orange-600">{currencySymbol}{item.recipeCost.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-blue-600 font-medium">
                    {currencySymbol}{item.unitMargin.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">{currencySymbol}{item.totalRevenue.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-semibold ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currencySymbol}{item.profit.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={item.marginPercent >= 50 ? 'default' : item.marginPercent >= 30 ? 'secondary' : 'destructive'}
                      className={`text-xs ${
                        item.marginPercent >= 50 ? 'bg-green-500/20 text-green-700 border-green-500/30' :
                        item.marginPercent >= 30 ? 'bg-amber-500/20 text-amber-700 border-amber-500/30' :
                        'bg-red-500/20 text-red-700 border-red-500/30'
                      }`}
                    >
                      {item.marginPercent.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
