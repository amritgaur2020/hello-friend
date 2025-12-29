import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DepartmentOrderForm, OrderData, OrderItemData } from '@/components/shared/DepartmentOrderForm';
import { useKitchenMenu, useKitchenMutations } from '@/hooks/useDepartmentData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { ChefHat } from 'lucide-react';

export default function KitchenOrders() {
  const { data: menuItems = [] } = useKitchenMenu();
  const { createOrder } = useKitchenMutations();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';

  const handlePlaceOrder = async (orderData: OrderData, itemsData: OrderItemData[]) => {
    await createOrder.mutateAsync({
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
  };

  return (
    <DashboardLayout title="Kitchen POS" subtitle="Create and manage food orders">
      <DepartmentOrderForm
        menuItems={menuItems}
        onPlaceOrder={handlePlaceOrder}
        isLoading={createOrder.isPending}
        currencySymbol={currencySymbol}
        ItemIcon={ChefHat}
        showPaymentOptions={true}
      />
    </DashboardLayout>
  );
}
