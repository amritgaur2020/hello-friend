import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReportsLayout } from "@/components/reports/ReportsLayout";
import { PLReportContent } from "@/components/reports/PLReportContent";
import { HourlyTrendsContent } from "@/components/reports/HourlyTrendsContent";
import { SalesReportContent } from "@/components/reports/SalesReportContent";
import { ItemsReportContent } from "@/components/reports/ItemsReportContent";
import { StockReportContent } from "@/components/reports/StockReportContent";
import { useKitchenOrders, useKitchenInventory, useKitchenOrderItemsAll, useKitchenMenu } from "@/hooks/useDepartmentData";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { isWithinInterval, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DepartmentOrder } from "@/types/department";

export default function KitchenReports() {
  const { data: orders = [] } = useKitchenOrders();
  const { data: inventory = [] } = useKitchenInventory();
  const { data: orderItems = [] } = useKitchenOrderItemsAll();
  const { data: menuItems = [] } = useKitchenMenu();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || "₹";

  // Fetch all orders for comparison (without limit)
  const { data: allOrders = [] } = useQuery({
    queryKey: ['kitchen-orders-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kitchen_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DepartmentOrder[];
    },
  });

  return (
    <DashboardLayout title="Kitchen Reports" subtitle="P/L analysis and detailed reports">
      <ReportsLayout department="kitchen">
        {({ activeReport, startDate, endDate, isCompareMode, comparisonType }) => {
          const filteredOrders = orders.filter(order => {
            const orderDate = parseISO(order.created_at || "");
            return isWithinInterval(orderDate, { start: startDate, end: endDate });
          });

          const filteredOrderIds = new Set(filteredOrders.map(o => o.id));
          const filteredItems = orderItems.filter(item => filteredOrderIds.has(item.order_id));

          switch (activeReport) {
            case "pl":
              return (
                <PLReportContent
                  orders={filteredOrders}
                  inventory={inventory}
                  currencySymbol={currencySymbol}
                  department="Kitchen"
                  startDate={startDate}
                  endDate={endDate}
                  menuItems={menuItems}
                  orderItems={filteredItems}
                  allOrders={allOrders}
                  allOrderItems={orderItems}
                  isCompareMode={isCompareMode}
                  comparisonType={comparisonType}
                />
              );
            case "hourly":
              return (
                <HourlyTrendsContent
                  orders={filteredOrders}
                  currencySymbol={currencySymbol}
                />
              );
            case "sales":
              return (
                <SalesReportContent
                  orders={filteredOrders}
                  currencySymbol={currencySymbol}
                  department="Kitchen"
                  startDate={startDate}
                  endDate={endDate}
                />
              );
            case "items":
              return (
                <ItemsReportContent
                  orderItems={filteredItems}
                  currencySymbol={currencySymbol}
                  department="Kitchen"
                  startDate={startDate}
                  endDate={endDate}
                />
              );
            case "stock":
              return (
                <StockReportContent
                  inventory={inventory}
                  currencySymbol={currencySymbol}
                  department="Kitchen"
                />
              );
            default:
              return null;
          }
        }}
      </ReportsLayout>
    </DashboardLayout>
  );
}
