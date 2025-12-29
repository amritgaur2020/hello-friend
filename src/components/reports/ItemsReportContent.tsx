import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Download, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Minus, 
  Search, Award, AlertTriangle, Package, DollarSign 
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { format, parseISO, isWithinInterval } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ItemsReportContentProps {
  orderItems: any[];
  currencySymbol: string;
  department: string;
  startDate: Date;
  endDate: Date;
  allOrderItems?: any[];
  isCompareMode?: boolean;
  comparisonType?: 'previous' | 'last_week' | 'last_month' | 'last_year';
  orders?: any[];
  allOrders?: any[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444", "#14b8a6"];

function getComparisonPeriodDates(startDate: Date, endDate: Date, comparisonType: string) {
  const periodLength = endDate.getTime() - startDate.getTime();
  
  switch (comparisonType) {
    case 'previous':
      return { start: new Date(startDate.getTime() - periodLength), end: new Date(startDate.getTime() - 1) };
    case 'last_week':
      const lastWeekStart = new Date(startDate);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(endDate);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
      return { start: lastWeekStart, end: lastWeekEnd };
    case 'last_month':
      const lastMonthStart = new Date(startDate);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      const lastMonthEnd = new Date(endDate);
      lastMonthEnd.setMonth(lastMonthEnd.getMonth() - 1);
      return { start: lastMonthStart, end: lastMonthEnd };
    case 'last_year':
      const lastYearStart = new Date(startDate);
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
      const lastYearEnd = new Date(endDate);
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
      return { start: lastYearStart, end: lastYearEnd };
    default:
      return { start: new Date(startDate.getTime() - periodLength), end: startDate };
  }
}

export function ItemsReportContent({ 
  orderItems, 
  currencySymbol, 
  department,
  startDate,
  endDate,
  allOrderItems = [],
  isCompareMode = false,
  comparisonType = 'previous',
  orders = [],
  allOrders = [],
}: ItemsReportContentProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Current period aggregation
  const itemsData = useMemo(() => {
    const itemsMap = new Map<string, { quantity: number; revenue: number; orders: number }>();
    orderItems.forEach(item => {
      const name = item.item_name || "Unknown";
      const existing = itemsMap.get(name) || { quantity: 0, revenue: 0, orders: 0 };
      itemsMap.set(name, {
        quantity: existing.quantity + (item.quantity || 1),
        revenue: existing.revenue + (item.total_price || 0),
        orders: existing.orders + 1,
      });
    });
    
    return Array.from(itemsMap.entries())
      .map(([name, data]) => ({ name, ...data, avgPrice: data.revenue / data.quantity }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orderItems]);

  // Comparison period data
  const comparison = useMemo(() => {
    if (!isCompareMode || allOrderItems.length === 0 || allOrders.length === 0) return null;
    
    const { start, end } = getComparisonPeriodDates(startDate, endDate, comparisonType);
    
    // Get orders from comparison period
    const compOrderIds = new Set(
      allOrders
        .filter(order => {
          const orderDate = parseISO(order.created_at || "");
          return isWithinInterval(orderDate, { start, end });
        })
        .map(o => o.id)
    );

    const compItems = allOrderItems.filter(item => compOrderIds.has(item.order_id));
    
    const itemsMap = new Map<string, { quantity: number; revenue: number }>();
    compItems.forEach(item => {
      const name = item.item_name || "Unknown";
      const existing = itemsMap.get(name) || { quantity: 0, revenue: 0 };
      itemsMap.set(name, {
        quantity: existing.quantity + (item.quantity || 1),
        revenue: existing.revenue + (item.total_price || 0),
      });
    });
    
    const totalQty = compItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
    const totalRev = compItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
    
    return {
      items: itemsMap,
      totalQuantity: totalQty,
      totalRevenue: totalRev,
      uniqueItems: itemsMap.size,
    };
  }, [isCompareMode, allOrderItems, allOrders, startDate, endDate, comparisonType]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, { revenue: number; quantity: number }>();
    orderItems.forEach(item => {
      const category = item.category || "Uncategorized";
      const existing = categoryMap.get(category) || { revenue: 0, quantity: 0 };
      categoryMap.set(category, {
        revenue: existing.revenue + (item.total_price || 0),
        quantity: existing.quantity + (item.quantity || 1),
      });
    });
    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orderItems]);

  // Current stats
  const totalItems = orderItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const totalRevenue = orderItems.reduce((sum, i) => sum + (i.total_price || 0), 0);

  // Calculate changes
  const getChange = (current: number, previous: number) => {
    if (previous === 0) return { value: current, percentage: current > 0 ? 100 : 0 };
    const percentage = ((current - previous) / previous) * 100;
    return { value: current - previous, percentage };
  };

  const revenueChange = comparison ? getChange(totalRevenue, comparison.totalRevenue) : null;
  const quantityChange = comparison ? getChange(totalItems, comparison.totalQuantity) : null;
  const uniqueChange = comparison ? getChange(itemsData.length, comparison.uniqueItems) : null;

  // Top performers and underperformers
  const topItems = itemsData.slice(0, 5);
  const lowItems = [...itemsData].sort((a, b) => a.revenue - b.revenue).slice(0, 5);
  
  // Items with decreased sales (if comparison available)
  const declinedItems = useMemo(() => {
    if (!comparison) return [];
    
    return itemsData
      .map(item => {
        const prevData = comparison.items.get(item.name);
        if (!prevData) return { ...item, change: item.revenue > 0 ? 100 : 0, isNew: true };
        const change = ((item.revenue - prevData.revenue) / prevData.revenue) * 100;
        return { ...item, change, prevRevenue: prevData.revenue, isNew: false };
      })
      .filter(item => !item.isNew && item.change < -10)
      .sort((a, b) => a.change - b.change)
      .slice(0, 5);
  }, [itemsData, comparison]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!searchTerm) return itemsData;
    return itemsData.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [itemsData, searchTerm]);

  const renderChangeIndicator = (change: { value: number; percentage: number } | null, small = false) => {
    if (!change) return null;
    const isNeutral = Math.abs(change.percentage) < 0.1;
    
    if (isNeutral) return <Minus className={`${small ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />;
    
    return change.percentage > 0 ? (
      <span className={`flex items-center text-green-600 ${small ? 'text-xs' : 'text-sm'}`}>
        <ArrowUp className={small ? 'h-3 w-3' : 'h-3 w-3'} />
        {Math.abs(change.percentage).toFixed(1)}%
      </span>
    ) : (
      <span className={`flex items-center text-red-600 ${small ? 'text-xs' : 'text-sm'}`}>
        <ArrowDown className={small ? 'h-3 w-3' : 'h-3 w-3'} />
        {Math.abs(change.percentage).toFixed(1)}%
      </span>
    );
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${department} Item Analysis`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Period: ${format(startDate, "MMM dd, yyyy")} - ${format(endDate, "MMM dd, yyyy")}`, 14, 30);
    
    autoTable(doc, {
      startY: 40,
      head: [["Rank", "Item", "Qty Sold", "Revenue", "Avg Price"]],
      body: itemsData.slice(0, 50).map((row, i) => [
        i + 1,
        row.name,
        row.quantity,
        `${currencySymbol}${row.revenue.toFixed(2)}`,
        `${currencySymbol}${row.avgPrice.toFixed(2)}`,
      ]),
    });
    
    doc.save(`${department}_Items_Report.pdf`);
  };

  const exportExcel = () => {
    const data = itemsData.map((row, i) => ({
      "Rank": i + 1,
      "Item Name": row.name,
      "Quantity Sold": row.quantity,
      "Revenue": row.revenue,
      "Avg Price": row.avgPrice,
      "Orders": row.orders,
    }));
    
    const categorySheet = categoryData.map(cat => ({
      "Category": cat.name,
      "Revenue": cat.revenue,
      "Quantity": cat.quantity,
    }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Items");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categorySheet), "Categories");
    XLSX.writeFile(wb, `${department}_Items_Report.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

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
              {isCompareMode && renderChangeIndicator(revenueChange)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Items Sold</p>
                  <p className="text-xl font-bold text-blue-600">{totalItems}</p>
                </div>
              </div>
              {isCompareMode && renderChangeIndicator(quantityChange)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Award className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unique Items</p>
                  <p className="text-xl font-bold text-purple-600">{itemsData.length}</p>
                </div>
              </div>
              {isCompareMode && renderChangeIndicator(uniqueChange)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Top Seller</p>
                <p className="text-lg font-bold text-amber-600 truncate max-w-[150px]">
                  {topItems[0]?.name || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">All Items ({filteredItems.length})</TabsTrigger>
          {isCompareMode && <TabsTrigger value="trends">Trends</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Top Selling Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topItems.map((item, index) => {
                    const percentage = (item.revenue / totalRevenue) * 100;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center p-0">
                              {index + 1}
                            </Badge>
                            <span className="font-medium truncate max-w-[150px]">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">{currencySymbol}{item.revenue.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{item.quantity} sold</p>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="revenue"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, "Revenue"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Performers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Low Selling Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowItems.map((item) => (
                      <TableRow key={item.name}>
                        <TableCell className="font-medium truncate max-w-[120px]">{item.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {currencySymbol}{item.revenue.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Declined Items (if comparing) */}
            {isCompareMode && declinedItems.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    Items with Declining Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {declinedItems.map((item: any) => (
                        <TableRow key={item.name}>
                          <TableCell className="font-medium truncate max-w-[120px]">{item.name}</TableCell>
                          <TableCell className="text-right">
                            {currencySymbol}{item.revenue.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {item.change.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Category Bar Chart */}
            {(!isCompareMode || declinedItems.length === 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Quantity by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                          formatter={(value: number) => [value, "Quantity"]}
                        />
                        <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-center">Qty Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg Price</TableHead>
                      {isCompareMode && <TableHead className="text-right">vs Prev</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isCompareMode ? 6 : 5} className="text-center text-muted-foreground py-12">
                          No items found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item, index) => {
                        const prevData = comparison?.items.get(item.name);
                        const change = prevData 
                          ? getChange(item.revenue, prevData.revenue)
                          : null;
                        
                        return (
                          <TableRow key={item.name}>
                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              {currencySymbol}{item.revenue.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {currencySymbol}{item.avgPrice.toFixed(2)}
                            </TableCell>
                            {isCompareMode && (
                              <TableCell className="text-right">
                                {!prevData ? (
                                  <Badge variant="outline" className="text-xs">New</Badge>
                                ) : (
                                  renderChangeIndicator(change, true)
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isCompareMode && (
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Item Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topItems.map(item => {
                        const prevData = comparison?.items.get(item.name);
                        return {
                          name: item.name.length > 15 ? item.name.slice(0, 15) + "..." : item.name,
                          current: item.revenue,
                          previous: prevData?.revenue || 0,
                        };
                      })}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, ""]}
                      />
                      <Legend />
                      <Bar dataKey="current" name="Current" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="previous" name="Previous" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}