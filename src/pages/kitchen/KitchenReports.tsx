import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReportsLayout } from "@/components/reports/ReportsLayout";
import { PLReportContent } from "@/components/reports/PLReportContent";
import { HourlyTrendsContent } from "@/components/reports/HourlyTrendsContent";
import { SalesReportContent } from "@/components/reports/SalesReportContent";
import { ItemsReportContent } from "@/components/reports/ItemsReportContent";
import { StockReportContent } from "@/components/reports/StockReportContent";
import { OrderHistoryContent } from "@/components/reports/OrderHistoryContent";
import { useKitchenOrders, useKitchenInventory, useKitchenOrderItemsAll, useKitchenMenuAll, useKitchenMutations } from "@/hooks/useDepartmentData";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { isWithinInterval, parseISO } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DepartmentOrder } from "@/types/department";
import { useToast } from "@/hooks/use-toast";

export default function KitchenReports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: orders = [] } = useKitchenOrders();
  const { data: inventory = [] } = useKitchenInventory();
  const { data: orderItems = [] } = useKitchenOrderItemsAll();
  const { data: menuItems = [] } = useKitchenMenuAll();
  const { updateOrder } = useKitchenMutations();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || "₹";

  const handleUpdateOrder = async (orderId: string, updates: any, items?: any[], newItemsToAdd?: any[]) => {
    await updateOrder.mutateAsync({ id: orderId, ...updates });
    
    if (items && items.length > 0) {
      for (const item of items) {
        if (!item.id.startsWith('new_')) {
          const { error } = await supabase
            .from('kitchen_order_items')
            .update({
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
            })
            .eq('id', item.id);
          
          if (error) console.error('Error updating item:', error);
        }
      }
    }
    
    if (newItemsToAdd && newItemsToAdd.length > 0) {
      const newItemsData = newItemsToAdd.map(item => ({
        order_id: orderId,
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));
      
      const { error } = await supabase.from('kitchen_order_items').insert(newItemsData);
      if (error) {
        console.error('Error adding new items:', error);
        toast({ title: 'Failed to add new items', variant: 'destructive' });
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['kitchen-order-items-all'] });
    queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
  };

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
            case "history":
              return (
                <OrderHistoryContent
                  orders={filteredOrders}
                  orderItems={filteredItems}
                  menuItems={menuItems}
                  currencySymbol={currencySymbol}
                  department="Kitchen"
                  startDate={startDate}
                  endDate={endDate}
                  onUpdateOrder={handleUpdateOrder}
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
