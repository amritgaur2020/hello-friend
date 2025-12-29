import { useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DepartmentOrderForm, OrderData, OrderItemData } from '@/components/shared/DepartmentOrderForm';
import { useRestaurantMenu, useRestaurantMutations } from '@/hooks/useDepartmentData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { useModuleAccess } from '@/hooks/usePermissions';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { UtensilsCrossed } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useReactToPrint } from 'react-to-print';
import { RestaurantKOTPrint } from '@/components/restaurant/RestaurantKOTPrint';
import { DepartmentOrder, DepartmentOrderItem } from '@/types/department';

export default function RestaurantOrders() {
  const { data: menuItems = [] } = useRestaurantMenu();
  const { createOrder } = useRestaurantMutations();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  
  // Permission checks
  const { canView, canCreate, loading, isAdmin } = useModuleAccess('restaurant');

  // Print state
  const [printOrder, setPrintOrder] = useState<DepartmentOrder | null>(null);
  const [printItems, setPrintItems] = useState<DepartmentOrderItem[]>([]);
  const kotPrintRef = useRef<HTMLDivElement>(null);

  const handlePrintKOT = useReactToPrint({
    contentRef: kotPrintRef,
    onAfterPrint: () => {
      setPrintOrder(null);
      setPrintItems([]);
    },
  });

  const handlePlaceOrder = async (orderData: OrderData, itemsData: OrderItemData[]) => {
    const result = await createOrder.mutateAsync({
      order: {
        order_type: orderData.order_type,
        table_number: orderData.table_number,
        subtotal: orderData.subtotal,
        tax_amount: orderData.tax_amount,
        total_amount: orderData.total_amount,
        status: orderData.status,
        payment_status: orderData.payment_status,
        payment_mode: orderData.payment_mode,
        guest_id: orderData.guest_id,
        room_id: orderData.room_id,
        notes: orderData.notes,
      },
      items: itemsData.map((item) => ({
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
    });

    // After order is created, fetch items and print KOT automatically
    if (result) {
      const { data: orderItems } = await supabase
        .from('restaurant_order_items')
        .select('*')
        .eq('order_id', result.id)
        .order('created_at', { ascending: true });

      if (orderItems && orderItems.length > 0) {
        const typedOrder: DepartmentOrder = {
          id: result.id,
          order_number: result.order_number || '',
          order_type: result.order_type || 'dine_in',
          table_number: result.table_number,
          guest_id: result.guest_id,
          room_id: result.room_id,
          status: result.status || 'new',
          subtotal: result.subtotal || 0,
          tax_amount: result.tax_amount || 0,
          discount_amount: result.discount_amount || 0,
          total_amount: result.total_amount || 0,
          payment_status: result.payment_status || 'pending',
          payment_mode: result.payment_mode,
          notes: result.notes,
          created_by: result.created_by,
          served_by: result.served_by,
          created_at: result.created_at || new Date().toISOString(),
          updated_at: result.updated_at || new Date().toISOString(),
        };

        const typedItems: DepartmentOrderItem[] = orderItems.map(item => ({
          id: item.id,
          order_id: item.order_id,
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total_price: item.total_price || 0,
          notes: item.notes,
          created_at: item.created_at || new Date().toISOString(),
        }));

        setPrintOrder(typedOrder);
        setPrintItems(typedItems);
        setTimeout(() => handlePrintKOT(), 100);
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout title="Restaurant POS" subtitle="Create and manage food orders">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Check view permission
  if (!canView && !isAdmin) {
    return (
      <DashboardLayout title="Restaurant POS" subtitle="Create and manage food orders">
        <AccessDenied 
          title="Access Denied" 
          message="You don't have permission to view the Restaurant module. Please contact your administrator."
        />
      </DashboardLayout>
    );
  }

  // Check create permission
  if (!canCreate && !isAdmin) {
    return (
      <DashboardLayout title="Restaurant POS" subtitle="Create and manage food orders">
        <AccessDenied 
          title="Permission Denied" 
          message="You don't have permission to create orders. Please contact your administrator to request create access."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Restaurant POS" subtitle="Create and manage food orders">
      <DepartmentOrderForm
        menuItems={menuItems}
        onPlaceOrder={handlePlaceOrder}
        isLoading={createOrder.isPending}
        currencySymbol={currencySymbol}
        ItemIcon={UtensilsCrossed}
        showPaymentOptions={true}
      />

      {/* Hidden print component */}
      <div className="hidden">
        {printOrder && printItems.length > 0 && (
          <RestaurantKOTPrint ref={kotPrintRef} order={printOrder} items={printItems} />
        )}
      </div>
    </DashboardLayout>
  );
}
