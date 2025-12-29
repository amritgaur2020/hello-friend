import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DepartmentOrderForm, OrderData, OrderItemData } from '@/components/shared/DepartmentOrderForm';
import { useBarMenu, useBarOrderMutations } from '@/hooks/useBarData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { useModuleAccess } from '@/hooks/usePermissions';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { Wine } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function BarOrders() {
  const { data: menuItems = [] } = useBarMenu();
  const { createOrder } = useBarOrderMutations();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  
  // Permission check
  const { canView, canCreate, loading, isAdmin } = useModuleAccess('bar');

  const handlePlaceOrder = async (orderData: OrderData, itemsData: OrderItemData[]) => {
    await createOrder.mutateAsync({
      order: {
        order_type: orderData.order_type as 'dine_in' | 'takeaway' | 'room_service',
        table_number: orderData.table_number,
        subtotal: orderData.subtotal,
        tax_amount: orderData.tax_amount,
        total_amount: orderData.total_amount,
        status: orderData.status as 'new' | 'preparing' | 'served' | 'billed' | 'cancelled',
        payment_status: orderData.payment_status as 'pending' | 'paid' | 'partial',
        payment_mode: orderData.payment_mode,
        notes: orderData.notes,
        guest_id: orderData.guest_id,
        room_id: orderData.room_id,
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

  // Show loading state
  if (loading) {
    return (
      <DashboardLayout title="Bar POS" subtitle="Create and manage orders">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Check view permission first
  if (!canView && !isAdmin) {
    return (
      <DashboardLayout title="Bar POS" subtitle="Create and manage orders">
        <AccessDenied 
          title="Access Denied" 
          message="You don't have permission to view the Bar POS. Please contact your administrator."
        />
      </DashboardLayout>
    );
  }

  // Check create permission for placing orders
  if (!canCreate && !isAdmin) {
    return (
      <DashboardLayout title="Bar POS" subtitle="Create and manage orders">
        <AccessDenied 
          title="Permission Denied" 
          message="You don't have permission to create orders. Please contact your administrator to request create access."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Bar POS" subtitle="Create and manage orders">
      <DepartmentOrderForm
        menuItems={menuItems}
        onPlaceOrder={handlePlaceOrder}
        isLoading={createOrder.isPending}
        currencySymbol={currencySymbol}
        ItemIcon={Wine}
        showPaymentOptions={true}
      />
    </DashboardLayout>
  );
}
