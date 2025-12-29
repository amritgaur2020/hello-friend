import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReportsLayout } from "@/components/reports/ReportsLayout";
import { PLReportContent } from "@/components/reports/PLReportContent";
import { HourlyTrendsContent } from "@/components/reports/HourlyTrendsContent";
import { SalesReportContent } from "@/components/reports/SalesReportContent";
import { ItemsReportContent } from "@/components/reports/ItemsReportContent";
import { StockReportContent } from "@/components/reports/StockReportContent";
import { OrderHistoryContent } from "@/components/reports/OrderHistoryContent";
import { useRestaurantOrders, useRestaurantInventory, useRestaurantOrderItemsAll, useRestaurantMenu, useRestaurantMutations } from "@/hooks/useDepartmentData";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { isWithinInterval, parseISO } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DepartmentOrder } from "@/types/department";
import { useToast } from "@/hooks/use-toast";

export default function RestaurantReports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: orders = [] } = useRestaurantOrders();
  const { data: inventory = [] } = useRestaurantInventory();
  const { data: orderItems = [] } = useRestaurantOrderItemsAll();
  const { data: menuItems = [] } = useRestaurantMenu();
  const { updateOrder } = useRestaurantMutations();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || "₹";

  const handleUpdateOrder = async (orderId: string, updates: any, items?: any[], newItemsToAdd?: any[]) => {
    // Update order
    await updateOrder.mutateAsync({ id: orderId, ...updates });
    
    // Update existing order items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        if (!item.id.startsWith('new_')) {
          const { error } = await supabase
            .from('restaurant_order_items')
            .update({
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
            })
            .eq('id', item.id);
          
          if (error) {
            console.error('Error updating item:', error);
          }
        }
      }
    }
    
    // Add new items
    if (newItemsToAdd && newItemsToAdd.length > 0) {
      const newItemsData = newItemsToAdd.map(item => ({
        order_id: orderId,
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));
      
      const { error } = await supabase
        .from('restaurant_order_items')
        .insert(newItemsData);
      
      if (error) {
        console.error('Error adding new items:', error);
        toast({ title: 'Failed to add new items', variant: 'destructive' });
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['restaurant-order-items-all'] });
    queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
  };

  // Fetch all orders for comparison (without limit)
  const { data: allOrders = [] } = useQuery({
    queryKey: ['restaurant-orders-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DepartmentOrder[];
    },
  });

  return (
    <DashboardLayout title="Restaurant Reports" subtitle="Comprehensive analytics and insights">
      <ReportsLayout department="restaurant">
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
                    department="Restaurant"
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
                    department="Restaurant"
                    startDate={startDate}
                    endDate={endDate}
                    allOrders={allOrders}
                    isCompareMode={isCompareMode}
                    comparisonType={comparisonType}
                  />
                );
              case "items":
                return (
                  <ItemsReportContent
                    orderItems={filteredItems}
                    currencySymbol={currencySymbol}
                    department="Restaurant"
                    startDate={startDate}
                    endDate={endDate}
                    allOrderItems={orderItems}
                    allOrders={allOrders}
                    orders={filteredOrders}
                    isCompareMode={isCompareMode}
                    comparisonType={comparisonType}
                  />
                );
              case "stock":
                return (
                  <StockReportContent
                    inventory={inventory}
                    currencySymbol={currencySymbol}
                    department="Restaurant"
                  />
                );
              case "history":
                return (
                  <OrderHistoryContent
                    orders={filteredOrders}
                    orderItems={filteredItems}
                    menuItems={menuItems}
                    currencySymbol={currencySymbol}
                    department="Restaurant"
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
