import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarInventory, BarMenuItem, BarOrder, BarOrderItem, BarInventoryTransaction } from '@/types/bar';
import { useToast } from '@/hooks/use-toast';
import { useActivityLog } from '@/hooks/useActivityLog';

type BarInventoryInsert = {
  name: string;
  category: string;
  unit?: string;
  current_stock?: number;
  min_stock_level?: number;
  cost_price?: number;
  selling_price?: number;
  supplier?: string | null;
  sku?: string | null;
};

type BarMenuItemInsert = {
  name: string;
  category: string;
  price?: number;
  description?: string | null;
  is_available?: boolean;
};

type BarOrderItemInsert = {
  order_id: string;
  item_name: string;
  unit_price: number;
  total_price: number;
  menu_item_id?: string | null;
  quantity?: number;
  notes?: string | null;
};

// Inventory Hooks
export function useBarInventory() {
  return useQuery({
    queryKey: ['bar-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bar_inventory')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as BarInventory[];
    },
  });
}

export function useBarInventoryMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  const addInventory = useMutation({
    mutationFn: async (item: BarInventoryInsert) => {
      const { data, error } = await supabase
        .from('bar_inventory')
        .insert([item])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bar-inventory'] });
      toast({ title: 'Item added to inventory' });
      logActivity({
        actionType: 'create',
        module: 'bar',
        description: `Added inventory item: ${data.name}`,
        recordId: data.id,
        recordType: 'bar_inventory',
        newData: data,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateInventory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BarInventory> & { id: string }) => {
      const { data: oldData } = await supabase
        .from('bar_inventory')
        .select('*')
        .eq('id', id)
        .single();
      
      const { data, error } = await supabase
        .from('bar_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { newData: data, oldData };
    },
    onSuccess: ({ newData, oldData }) => {
      queryClient.invalidateQueries({ queryKey: ['bar-inventory'] });
      toast({ title: 'Inventory updated' });
      logActivity({
        actionType: 'update',
        module: 'bar',
        description: `Updated inventory item: ${newData.name}`,
        recordId: newData.id,
        recordType: 'bar_inventory',
        oldData,
        newData,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const bulkAddInventory = useMutation({
    mutationFn: async (items: BarInventoryInsert[]) => {
      const { data: existingInventory, error: fetchError } = await supabase
        .from('bar_inventory')
        .select('name');
      
      if (fetchError) throw fetchError;

      const existingNames = new Set(existingInventory?.map(i => i.name.toLowerCase()) || []);

      const { data: existingMenu, error: menuFetchError } = await supabase
        .from('bar_menu_items')
        .select('name');
      
      if (menuFetchError) throw menuFetchError;

      const existingMenuNames = new Set(existingMenu?.map(i => i.name.toLowerCase()) || []);

      const newInventoryItems = items.filter(item => !existingNames.has(item.name.toLowerCase()));
      const skippedCount = items.length - newInventoryItems.length;

      if (newInventoryItems.length === 0) {
        return { imported: 0, skipped: skippedCount };
      }

      const { data: inventoryData, error: inventoryError } = await supabase
        .from('bar_inventory')
        .insert(newInventoryItems)
        .select();
      if (inventoryError) throw inventoryError;

      const newMenuItems = newInventoryItems
        .filter(item => !existingMenuNames.has(item.name.toLowerCase()))
        .map(item => ({
          name: item.name,
          category: item.category,
          price: item.selling_price || 0,
          description: null,
          is_available: true,
          is_active: true,
        }));

      if (newMenuItems.length > 0) {
        const { error: menuError } = await supabase
          .from('bar_menu_items')
          .insert(newMenuItems);
        
        if (menuError) {
          console.error('Error adding to menu:', menuError);
        }
      }

      return { imported: inventoryData?.length || 0, skipped: skippedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bar-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['bar-menu'] });
      const message = result.skipped > 0 
        ? `${result.imported} items imported, ${result.skipped} duplicates skipped`
        : `${result.imported} items imported to inventory & menu`;
      toast({ title: message });
      logActivity({
        actionType: 'create',
        module: 'bar',
        description: `Bulk imported ${result.imported} inventory items`,
        newData: { imported: result.imported, skipped: result.skipped },
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
    },
  });

  const deleteInventory = useMutation({
    mutationFn: async (id: string) => {
      const { data: item } = await supabase
        .from('bar_inventory')
        .select('*')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('bar_inventory')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bar-inventory'] });
      toast({ title: 'Inventory item deleted' });
      if (data) {
        logActivity({
          actionType: 'delete',
          module: 'bar',
          description: `Deleted inventory item: ${data.name}`,
          recordId: data.id,
          recordType: 'bar_inventory',
          oldData: data,
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { addInventory, updateInventory, bulkAddInventory, deleteInventory };
}

// Menu Hooks
export function useBarMenu() {
  return useQuery({
    queryKey: ['bar-menu'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('bar_menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true }) as any);
      if (error) throw error;
      return data as BarMenuItem[];
    },
  });
}

export function useBarMenuMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  const addMenuItem = useMutation({
    mutationFn: async (item: BarMenuItemInsert) => {
      const { data, error } = await supabase
        .from('bar_menu_items')
        .insert([item])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bar-menu'] });
      toast({ title: 'Menu item added' });
      logActivity({
        actionType: 'create',
        module: 'bar',
        description: `Added menu item: ${data.name}`,
        recordId: data.id,
        recordType: 'bar_menu_items',
        newData: data,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMenuItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BarMenuItem> & { id: string }) => {
      const { data: oldData } = await supabase
        .from('bar_menu_items')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('bar_menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { newData: data, oldData };
    },
    onSuccess: ({ newData, oldData }) => {
      queryClient.invalidateQueries({ queryKey: ['bar-menu'] });
      toast({ title: 'Menu item updated' });
      logActivity({
        actionType: 'update',
        module: 'bar',
        description: `Updated menu item: ${newData.name}`,
        recordId: newData.id,
        recordType: 'bar_menu_items',
        oldData,
        newData,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleAvailability = useMutation({
    mutationFn: async ({ id, is_available, name }: { id: string; is_available: boolean; name?: string }) => {
      const { error } = await supabase
        .from('bar_menu_items')
        .update({ is_available })
        .eq('id', id);
      if (error) throw error;
      return { id, is_available, name };
    },
    onSuccess: ({ is_available, name }) => {
      queryClient.invalidateQueries({ queryKey: ['bar-menu'] });
      logActivity({
        actionType: 'update',
        module: 'bar',
        description: `Marked menu item "${name || 'item'}" as ${is_available ? 'available' : 'unavailable'}`,
      });
    },
  });

  const deleteMenuItem = useMutation({
    mutationFn: async (id: string) => {
      const { data: item } = await supabase
        .from('bar_menu_items')
        .select('*')
        .eq('id', id)
        .single();
      
      const { error } = await (supabase
        .from('bar_menu_items')
        .update({ is_available: false })
        .eq('id', id) as any);
      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bar-menu'] });
      toast({ title: 'Menu item deleted' });
      if (data) {
        logActivity({
          actionType: 'delete',
          module: 'bar',
          description: `Deleted menu item: ${data.name}`,
          recordId: data.id,
          recordType: 'bar_menu_items',
          oldData: data,
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { addMenuItem, updateMenuItem, toggleAvailability, deleteMenuItem };
}

// Orders Hooks
export function useBarOrders(status?: string) {
  return useQuery({
    queryKey: ['bar-orders', status],
    queryFn: async () => {
      let query = supabase
        .from('bar_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as BarOrder[];
    },
  });
}

export function useBarOrderItems(orderId: string) {
  return useQuery({
    queryKey: ['bar-order-items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bar_order_items')
        .select('*')
        .eq('order_id', orderId);
      if (error) throw error;
      return data as BarOrderItem[];
    },
    enabled: !!orderId,
  });
}

// Fetch all order items for reports
export function useBarOrderItemsAll() {
  return useQuery({
    queryKey: ['bar-order-items-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bar_order_items')
        .select('*');
      if (error) throw error;
      return data as BarOrderItem[];
    },
  });
}

export function useBarOrderMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  const createOrder = useMutation({
    mutationFn: async ({ order, items }: { order: Partial<BarOrder> & { guest_id?: string | null; room_id?: string | null }; items: Partial<BarOrderItem>[] }) => {
      const { data: orderNumber } = await supabase.rpc('generate_bar_order_number');
      
      const { data: newOrder, error: orderError } = await supabase
        .from('bar_orders')
        .insert({ 
          ...order, 
          order_number: orderNumber,
          guest_id: order.guest_id || null,
          room_id: order.room_id || null,
        })
        .select()
        .single();
      
      if (orderError) throw orderError;

      const orderItems: BarOrderItemInsert[] = items.map(item => ({
        order_id: newOrder.id,
        item_name: item.item_name || '',
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0,
        menu_item_id: item.menu_item_id || null,
        quantity: item.quantity || 1,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('bar_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return { order: newOrder, items: orderItems };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bar-orders'] });
      toast({ title: 'Order created successfully' });
      const orderWithItems = { ...data.order, items: data.items };
      logActivity({
        actionType: 'create',
        module: 'bar',
        description: `Created order ${data.order.order_number}`,
        recordId: data.order.id,
        recordType: 'bar_orders',
        newData: orderWithItems,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, order, items }: { id: string; order: Partial<BarOrder>; items?: Partial<BarOrderItem>[] }) => {
      const { data: oldData } = await supabase
        .from('bar_orders')
        .select('*')
        .eq('id', id)
        .single();

      const { error: orderError } = await supabase
        .from('bar_orders')
        .update(order)
        .eq('id', id);
      
      if (orderError) throw orderError;

      if (items && items.length > 0) {
        const { error: deleteError } = await supabase
          .from('bar_order_items')
          .delete()
          .eq('order_id', id);
        
        if (deleteError) throw deleteError;

        const orderItems: BarOrderItemInsert[] = items.map(item => ({
          order_id: id,
          item_name: item.item_name || '',
          unit_price: item.unit_price || 0,
          total_price: item.total_price || 0,
          menu_item_id: item.menu_item_id || null,
          quantity: item.quantity || 1,
          notes: item.notes || null,
        }));

        const { error: itemsError } = await supabase
          .from('bar_order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      return { id, oldData, newData: order };
    },
    onSuccess: ({ id, oldData, newData }) => {
      queryClient.invalidateQueries({ queryKey: ['bar-orders'] });
      queryClient.invalidateQueries({ queryKey: ['bar-order-items'] });
      toast({ title: 'Order updated successfully' });
      logActivity({
        actionType: 'update',
        module: 'bar',
        description: `Updated order ${oldData?.order_number || id}`,
        recordId: id,
        recordType: 'bar_orders',
        oldData,
        newData,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: orderData } = await supabase
        .from('bar_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (!orderData) throw new Error('Order not found');

      // Soft delete: Set all amounts to zero and mark as cancelled
      const { data: updatedOrder, error: orderError } = await supabase
        .from('bar_orders')
        .update({ 
          status: 'cancelled',
          subtotal: 0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 0,
          notes: `[CANCELLED - ${reason}] ${orderData.notes || ''}`
        })
        .eq('id', id)
        .select()
        .single();
      
      if (orderError) throw orderError;

      // Set order item amounts to zero but keep them for record
      await supabase
        .from('bar_order_items')
        .update({ unit_price: 0, total_price: 0 })
        .eq('order_id', id);

      return { order: orderData, updatedOrder, reason };
    },
    onSuccess: ({ order, reason }) => {
      queryClient.invalidateQueries({ queryKey: ['bar-orders'] });
      toast({ title: 'Order cancelled and zeroed' });
      logActivity({
        actionType: 'delete',
        module: 'bar',
        description: `Cancelled order ${order?.order_number || 'unknown'} - Reason: ${reason} (original total: ${order?.total_amount})`,
        recordId: order?.id,
        recordType: 'bar_orders',
        oldData: order,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('bar_orders')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: ({ id, status }) => {
      queryClient.invalidateQueries({ queryKey: ['bar-orders'] });
      logActivity({
        actionType: 'update',
        module: 'bar',
        description: `Updated order status to "${status}"`,
        recordId: id,
        recordType: 'bar_orders',
      });
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, payment_status, payment_mode }: { id: string; payment_status: string; payment_mode: string }) => {
      const { data: orderData } = await supabase
        .from('bar_orders')
        .select('order_number, total_amount')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('bar_orders')
        .update({ payment_status, payment_mode, status: 'billed' })
        .eq('id', id);
      if (error) throw error;
      return { id, orderData, payment_mode };
    },
    onSuccess: ({ id, orderData, payment_mode }) => {
      queryClient.invalidateQueries({ queryKey: ['bar-orders'] });
      toast({ title: 'Payment recorded' });
      logActivity({
        actionType: 'update',
        module: 'bar',
        description: `Recorded payment for order ${orderData?.order_number} (${payment_mode})`,
        recordId: id,
        recordType: 'bar_orders',
        newData: { payment_status: 'paid', payment_mode, total_amount: orderData?.total_amount },
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateOrderItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BarOrderItem> & { id: string }) => {
      const { error } = await supabase
        .from('bar_order_items')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bar-order-items'] });
    },
  });

  const deleteOrderItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bar_order_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bar-order-items'] });
    },
  });

  const addOrderItem = useMutation({
    mutationFn: async (item: BarOrderItemInsert) => {
      const { data, error } = await supabase
        .from('bar_order_items')
        .insert([item])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bar-order-items'] });
    },
  });

  return { createOrder, updateOrder, deleteOrder, updateOrderStatus, updatePayment, updateOrderItem, deleteOrderItem, addOrderItem };
}

// Stats Hooks
export function useBarStats() {
  return useQuery({
    queryKey: ['bar-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: todayOrders, error: ordersError } = await supabase
        .from('bar_orders')
        .select('total_amount, status, payment_status')
        .gte('created_at', today);
      
      if (ordersError) throw ordersError;

      const { data: lowStock } = await supabase
        .from('bar_inventory')
        .select('id')
        .eq('is_active', true)
        .lt('current_stock', 5);

      const activeOrders = todayOrders?.filter(o => ['new', 'preparing', 'served'].includes(o.status)) || [];
      const pendingBills = todayOrders?.filter(o => o.status === 'served' && o.payment_status === 'pending') || [];
      const todayRevenue = todayOrders?.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

      return {
        activeOrders: activeOrders.length,
        todayRevenue,
        pendingBills: pendingBills.length,
        lowStockItems: lowStock?.length || 0,
        totalOrders: todayOrders?.length || 0,
      };
    },
  });
}

// Inventory Transactions
export function useInventoryTransactions(inventoryId?: string) {
  return useQuery({
    queryKey: ['bar-inventory-transactions', inventoryId],
    queryFn: async () => {
      let query = supabase
        .from('bar_inventory_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (inventoryId) {
        query = query.eq('inventory_id', inventoryId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as BarInventoryTransaction[];
    },
    enabled: !inventoryId || !!inventoryId,
  });
}

export function useInventoryTransactionMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  const addTransaction = useMutation({
    mutationFn: async (transaction: Partial<BarInventoryTransaction>) => {
      const { data: inventory } = await supabase
        .from('bar_inventory')
        .select('current_stock, name')
        .eq('id', transaction.inventory_id)
        .single();

      const previousStock = inventory?.current_stock || 0;
      const quantityChange = transaction.transaction_type === 'sale' || transaction.transaction_type === 'waste' 
        ? -Math.abs(transaction.quantity || 0)
        : Math.abs(transaction.quantity || 0);
      const newStock = previousStock + quantityChange;

      const { error: txError } = await supabase
        .from('bar_inventory_transactions')
        .insert([{
          inventory_id: transaction.inventory_id!,
          transaction_type: transaction.transaction_type!,
          quantity: transaction.quantity!,
          notes: transaction.notes || null,
          created_by: transaction.created_by || null,
        }]);
      
      if (txError) throw txError;

      const { error: invError } = await supabase
        .from('bar_inventory')
        .update({ 
          current_stock: newStock,
          last_restocked: transaction.transaction_type === 'purchase' ? new Date().toISOString() : undefined,
        })
        .eq('id', transaction.inventory_id);

      if (invError) throw invError;

      return { inventoryName: inventory?.name, transaction, previousStock, newStock };
    },
    onSuccess: ({ inventoryName, transaction, previousStock, newStock }) => {
      queryClient.invalidateQueries({ queryKey: ['bar-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['bar-inventory-transactions'] });
      toast({ title: 'Stock updated' });
      
      const transactionTypeLabels: Record<string, string> = {
        purchase: 'Purchase/Restock',
        sale: 'Sale',
        waste: 'Wastage',
        adjustment: 'Stock Adjustment',
        transfer_in: 'Transfer In',
        transfer_out: 'Transfer Out',
        return: 'Return',
      };
      const typeLabel = transactionTypeLabels[transaction.transaction_type || ''] || transaction.transaction_type;
      const changeDirection = transaction.transaction_type === 'sale' || transaction.transaction_type === 'waste' ? '-' : '+';
      
      logActivity({
        actionType: 'update',
        module: 'bar',
        description: `${typeLabel}: "${inventoryName}" stock changed from ${previousStock} to ${newStock} (${changeDirection}${transaction.quantity})${transaction.notes ? ` - Reason: ${transaction.notes}` : ''}`,
        recordId: transaction.inventory_id,
        recordType: 'inventory',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { addTransaction };
}
