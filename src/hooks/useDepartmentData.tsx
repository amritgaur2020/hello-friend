import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DepartmentInventory, DepartmentMenuItem, DepartmentOrder, DepartmentOrderItem, SpaService, SpaBooking, HousekeepingTask } from '@/types/department';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Json } from '@/integrations/supabase/types';
import { convertIngredientToInventoryUnit } from '@/constants/inventoryUnits';

// Insert types for Supabase
type KitchenInventoryInsert = {
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

type MenuItemInsert = {
  name: string;
  category: string;
  price?: number;
  description?: string | null;
  is_available?: boolean;
  ingredients?: Json;
};

type MenuItemUpdate = {
  id: string;
  name?: string;
  category?: string;
  price?: number;
  description?: string | null;
  is_available?: boolean;
  ingredients?: Json;
};

type OrderItemInsert = {
  order_id: string;
  item_name: string;
  unit_price: number;
  total_price: number;
  menu_item_id?: string | null;
  quantity?: number;
  notes?: string | null;
};

// =============================================
// KITCHEN HOOKS
// =============================================

export function useKitchenInventory() {
  return useQuery({
    queryKey: ['kitchen-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kitchen_inventory')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as DepartmentInventory[];
    },
  });
}

export function useKitchenMenu() {
  return useQuery({
    queryKey: ['kitchen-menu'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('kitchen_menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category')
        .order('name') as any);
      if (error) throw error;
      return data as DepartmentMenuItem[];
    },
  });
}

export function useKitchenOrders(status?: string) {
  return useQuery({
    queryKey: ['kitchen-orders', status],
    queryFn: async () => {
      let query = supabase
        .from('kitchen_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as DepartmentOrder[];
    },
  });
}

export function useKitchenOrderItems(orderId: string) {
  return useQuery({
    queryKey: ['kitchen-order-items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kitchen_order_items')
        .select('*')
        .eq('order_id', orderId);
      if (error) throw error;
      return data as DepartmentOrderItem[];
    },
    enabled: !!orderId,
  });
}

// Fetch all kitchen order items for reports
export function useKitchenOrderItemsAll() {
  return useQuery({
    queryKey: ['kitchen-order-items-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kitchen_order_items')
        .select('*');
      if (error) throw error;
      return data as DepartmentOrderItem[];
    },
  });
}

export function useKitchenMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  const addInventory = useMutation({
    mutationFn: async (item: KitchenInventoryInsert) => {
      const { data, error } = await supabase
        .from('kitchen_inventory')
        .insert([item])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-inventory'] });
      toast({ title: 'Item added to kitchen inventory' });
      logActivity({ actionType: 'create', module: 'kitchen', description: `added inventory item "${data.name}"`, recordType: 'inventory', newData: data as unknown as Json });
    },
  });

  const updateInventory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DepartmentInventory> & { id: string }) => {
      const { data, error } = await supabase
        .from('kitchen_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-inventory'] });
      toast({ title: 'Kitchen inventory updated' });
      logActivity({ actionType: 'edit', module: 'kitchen', description: `updated inventory item "${data.name}"`, recordType: 'inventory', newData: data as unknown as Json });
    },
  });

  const addMenuItem = useMutation({
    mutationFn: async (item: MenuItemInsert) => {
      const { data, error } = await supabase
        .from('kitchen_menu_items')
        .insert([item])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-menu'] });
      toast({ title: 'Menu item added' });
      logActivity({ actionType: 'create', module: 'kitchen', description: `added menu item "${data.name}"`, recordType: 'menu', newData: data as unknown as Json });
    },
  });

  const updateMenuItem = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; category?: string; price?: number; description?: string | null; is_available?: boolean }) => {
      const { data, error } = await supabase
        .from('kitchen_menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-menu'] });
      toast({ title: 'Menu item updated' });
      logActivity({ actionType: 'edit', module: 'kitchen', description: `updated menu item "${data.name}"`, recordType: 'menu', newData: data as unknown as Json });
    },
  });

  const createOrder = useMutation({
    mutationFn: async ({ order, items }: { order: Partial<DepartmentOrder> & { guest_id?: string; room_id?: string; payment_mode?: string }; items: Partial<DepartmentOrderItem>[] }) => {
      const { data: orderNumber } = await supabase.rpc('generate_kitchen_order_number');
      
      const { data: newOrder, error: orderError } = await supabase
        .from('kitchen_orders')
        .insert([{ 
          order_number: orderNumber,
          order_type: order.order_type || 'dine_in',
          table_number: order.table_number,
          status: order.status || 'new',
          subtotal: order.subtotal || 0,
          tax_amount: order.tax_amount || 0,
          discount_amount: order.discount_amount || 0,
          total_amount: order.total_amount || 0,
          payment_status: order.payment_status || 'pending',
          payment_mode: order.payment_mode || null,
          guest_id: order.guest_id || null,
          room_id: order.room_id || null,
          notes: order.notes,
        }])
        .select()
        .single();
      
      if (orderError) throw orderError;

      const orderItems: OrderItemInsert[] = items.map(item => ({
        order_id: newOrder.id,
        item_name: item.item_name || '',
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0,
        menu_item_id: item.menu_item_id || null,
        quantity: item.quantity || 1,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('kitchen_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return newOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      toast({ title: 'Kitchen order created' });
      logActivity({ actionType: 'create', module: 'kitchen', description: `created order ${data.order_number}`, recordType: 'order', recordId: data.id, newData: data as unknown as Json });
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // Get old data first
      const { data: oldData } = await supabase.from('kitchen_orders').select('*').eq('id', id).single();
      
      const { data, error } = await supabase
        .from('kitchen_orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { newData: data, oldData };
    },
    onSuccess: ({ newData, oldData }) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      if (oldData && newData) {
        logActivity({ 
          actionType: 'edit', 
          module: 'kitchen', 
          description: `updated order ${newData.order_number} status from "${oldData.status}" to "${newData.status}"`, 
          recordType: 'order', 
          recordId: newData.id,
          oldData: oldData as unknown as Json,
          newData: newData as unknown as Json 
        });
      }
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: order } = await supabase.from('kitchen_orders').select('*').eq('id', id).single();
      if (!order) throw new Error('Order not found');
      
      // Soft delete: Set all amounts to zero and mark as cancelled
      const { data: updatedOrder, error: orderError } = await supabase
        .from('kitchen_orders')
        .update({ 
          status: 'cancelled',
          subtotal: 0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 0,
          notes: `[CANCELLED - ${reason}] ${order.notes || ''}`
        })
        .eq('id', id)
        .select()
        .single();
      if (orderError) throw orderError;
      
      // Set order item amounts to zero but keep them for record
      await supabase
        .from('kitchen_order_items')
        .update({ unit_price: 0, total_price: 0 })
        .eq('order_id', id);
      
      return { order, updatedOrder, reason };
    },
    onSuccess: ({ order, reason }) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      toast({ title: 'Order cancelled and zeroed' });
      if (order) {
        logActivity({ 
          actionType: 'delete', 
          module: 'kitchen', 
          description: `cancelled order ${order.order_number} - Reason: ${reason} (original total: ${order.total_amount})`, 
          recordType: 'order',
          recordId: order.id,
          oldData: order as unknown as Json
        });
      }
    },
  });

  const deleteInventory = useMutation({
    mutationFn: async (id: string) => {
      const { data: item } = await supabase.from('kitchen_inventory').select('*').eq('id', id).single();
      const { error } = await supabase.from('kitchen_inventory').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-inventory'] });
      toast({ title: 'Inventory item deleted' });
      if (data) {
        logActivity({ actionType: 'delete', module: 'kitchen', description: `deleted inventory item "${data.name}"`, recordType: 'inventory', oldData: data as unknown as Json });
      }
    },
  });

  const deleteMenuItem = useMutation({
    mutationFn: async (id: string) => {
      const { data: item } = await supabase.from('kitchen_menu_items').select('*').eq('id', id).single();
      const { error } = await (supabase.from('kitchen_menu_items').update({ is_available: false }).eq('id', id) as any);
      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-menu'] });
      toast({ title: 'Menu item deleted' });
      if (data) {
        logActivity({ actionType: 'delete', module: 'kitchen', description: `deleted menu item "${data.name}"`, recordType: 'menu', oldData: data as unknown as Json });
      }
    },
  });

  const bulkAddInventory = useMutation({
    mutationFn: async (items: KitchenInventoryInsert[]) => {
      const { data: existing } = await supabase.from('kitchen_inventory').select('name').eq('is_active', true);
      const existingNames = new Set((existing || []).map(i => i.name.toLowerCase()));
      const newItems = items.filter(item => !existingNames.has(item.name.toLowerCase()));
      
      if (newItems.length === 0) return { inserted: 0, skipped: items.length };
      
      const { data, error } = await supabase.from('kitchen_inventory').insert(newItems).select();
      if (error) throw error;
      return { inserted: data.length, skipped: items.length - newItems.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-inventory'] });
      toast({ title: `Imported ${result.inserted} items${result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : ''}` });
      logActivity({ actionType: 'create', module: 'kitchen', description: `bulk imported ${result.inserted} inventory items`, recordType: 'inventory' });
    },
    onError: () => {
      toast({ title: 'Failed to import items', variant: 'destructive' });
    },
  });

  const addTransaction = useMutation({
    mutationFn: async (transaction: { inventory_id: string; transaction_type: string; quantity: number; notes?: string }) => {
      const { data: item } = await supabase.from('kitchen_inventory').select('*').eq('id', transaction.inventory_id).single();
      if (!item) throw new Error('Item not found');
      
      const isAdd = ['purchase', 'transfer_in', 'adjustment', 'return'].includes(transaction.transaction_type);
      const newStock = isAdd ? item.current_stock + transaction.quantity : item.current_stock - transaction.quantity;
      
      const { error: updateError } = await supabase.from('kitchen_inventory').update({ current_stock: newStock }).eq('id', transaction.inventory_id);
      if (updateError) throw updateError;
      
      return { item, newStock, transaction };
    },
    onSuccess: ({ item, newStock, transaction }) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-inventory'] });
      toast({ title: 'Stock updated successfully' });
      
      const transactionTypeLabels: Record<string, string> = {
        purchase: 'Purchase/Restock',
        consumption: 'Consumption',
        wastage: 'Wastage',
        transfer_in: 'Transfer In',
        transfer_out: 'Transfer Out',
        adjustment: 'Stock Adjustment',
        return: 'Return',
      };
      const typeLabel = transactionTypeLabels[transaction.transaction_type] || transaction.transaction_type;
      const changeDirection = ['purchase', 'transfer_in', 'adjustment', 'return'].includes(transaction.transaction_type) ? '+' : '-';
      
      logActivity({ 
        actionType: 'edit', 
        module: 'kitchen', 
        description: `${typeLabel}: "${item.name}" stock changed from ${item.current_stock} ${item.unit || 'pcs'} to ${newStock} ${item.unit || 'pcs'} (${changeDirection}${transaction.quantity} ${item.unit || 'pcs'})${transaction.notes ? ` - Reason: ${transaction.notes}` : ''}`, 
        recordType: 'inventory',
        recordId: item.id,
      });
    },
  });

  return { addInventory, updateInventory, addMenuItem, updateMenuItem, createOrder, updateOrderStatus, deleteOrder, deleteInventory, deleteMenuItem, bulkAddInventory, addTransaction };
}

// =============================================
// RESTAURANT HOOKS
// =============================================

export function useRestaurantInventory() {
  return useQuery({
    queryKey: ['restaurant-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_inventory')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as DepartmentInventory[];
    },
  });
}

export function useRestaurantMenu() {
  return useQuery({
    queryKey: ['restaurant-menu'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('restaurant_menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category')
        .order('name') as any);
      if (error) throw error;
      return data as DepartmentMenuItem[];
    },
  });
}

export function useRestaurantOrders(status?: string) {
  return useQuery({
    queryKey: ['restaurant-orders', status],
    queryFn: async () => {
      let query = supabase
        .from('restaurant_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as DepartmentOrder[];
    },
  });
}

// Fetch all restaurant order items for reports
export function useRestaurantOrderItemsAll() {
  return useQuery({
    queryKey: ['restaurant-order-items-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_order_items')
        .select('*');
      if (error) throw error;
      return data as DepartmentOrderItem[];
    },
  });
}

export function useRestaurantMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  const addInventory = useMutation({
    mutationFn: async (item: KitchenInventoryInsert) => {
      const { data, error } = await supabase
        .from('restaurant_inventory')
        .insert([item])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-inventory'] });
      toast({ title: 'Item added to restaurant inventory' });
      logActivity({ actionType: 'create', module: 'restaurant', description: `added inventory item "${data.name}"`, recordType: 'inventory', newData: data as unknown as Json });
    },
  });

  const updateInventory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DepartmentInventory> & { id: string }) => {
      const { data, error } = await supabase
        .from('restaurant_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-inventory'] });
      toast({ title: 'Restaurant inventory updated' });
      logActivity({ actionType: 'edit', module: 'restaurant', description: `updated inventory item "${data.name}"`, recordType: 'inventory', newData: data as unknown as Json });
    },
  });

  const addMenuItem = useMutation({
    mutationFn: async (item: MenuItemInsert) => {
      const { data, error } = await supabase
        .from('restaurant_menu_items')
        .insert([item])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu'] });
      toast({ title: 'Menu item added' });
      logActivity({ actionType: 'create', module: 'restaurant', description: `added menu item "${data.name}"`, recordType: 'menu', newData: data as unknown as Json });
    },
  });

  const updateMenuItem = useMutation({
    mutationFn: async ({ id, ...updates }: MenuItemUpdate) => {
      const { data, error } = await supabase
        .from('restaurant_menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu'] });
      toast({ title: 'Menu item updated' });
      logActivity({ actionType: 'edit', module: 'restaurant', description: `updated menu item "${data.name}"`, recordType: 'menu', newData: data as unknown as Json });
    },
  });

  const createOrder = useMutation({
    mutationFn: async ({ order, items }: { order: Partial<DepartmentOrder> & { guest_id?: string; room_id?: string; payment_mode?: string }; items: Partial<DepartmentOrderItem>[] }) => {
      const { data: orderNumber } = await supabase.rpc('generate_restaurant_order_number');
      
      const { data: newOrder, error: orderError } = await supabase
        .from('restaurant_orders')
        .insert([{
          order_number: orderNumber,
          order_type: order.order_type || 'dine_in',
          table_number: order.table_number,
          status: order.status || 'new',
          subtotal: order.subtotal || 0,
          tax_amount: order.tax_amount || 0,
          discount_amount: order.discount_amount || 0,
          total_amount: order.total_amount || 0,
          payment_status: order.payment_status || 'pending',
          payment_mode: order.payment_mode || null,
          guest_id: order.guest_id || null,
          room_id: order.room_id || null,
          notes: order.notes,
        }])
        .select()
        .single();
      
      if (orderError) throw orderError;

      const orderItems: OrderItemInsert[] = items.map(item => ({
        order_id: newOrder.id,
        item_name: item.item_name || '',
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0,
        menu_item_id: item.menu_item_id || null,
        quantity: item.quantity || 1,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('restaurant_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Auto-deduct ingredients from inventory for each item with a recipe
      for (const item of items) {
        if (item.menu_item_id) {
          try {
            // Get menu item with recipe
            const { data: menuItem } = await supabase
              .from('restaurant_menu_items')
              .select('name, ingredients')
              .eq('id', item.menu_item_id)
              .single();
            
            if (menuItem?.ingredients && Array.isArray(menuItem.ingredients)) {
              const ingredients = menuItem.ingredients as { inventory_id: string; inventory_name: string; quantity: number; unit: string }[];
              
              for (const ingredient of ingredients) {
                if (!ingredient.inventory_id) continue;
                
                // Fetch inventory item WITH unit for proper conversion
                const { data: invItem } = await supabase
                  .from('restaurant_inventory')
                  .select('id, name, current_stock, unit')
                  .eq('id', ingredient.inventory_id)
                  .single();
                
                if (!invItem) continue;
                
                // Convert ingredient quantity to inventory unit (e.g., 250g → 0.25kg)
                const recipeQty = ingredient.quantity * (item.quantity || 1);
                const convertedQty = convertIngredientToInventoryUnit(
                  recipeQty,
                  ingredient.unit,
                  invItem.unit || 'pcs'
                );
                
                // Skip if units are incompatible (conversion returned null)
                if (convertedQty === null) {
                  console.warn(`Unit mismatch: Cannot convert ${ingredient.unit} to ${invItem.unit} for ${ingredient.inventory_name}`);
                  continue;
                }
                
                const newStock = Math.max(0, invItem.current_stock - convertedQty);
                
                await supabase
                  .from('restaurant_inventory')
                  .update({ current_stock: newStock })
                  .eq('id', ingredient.inventory_id);
                
                await supabase.from('restaurant_inventory_transactions').insert({
                  inventory_id: ingredient.inventory_id,
                  transaction_type: 'consumption',
                  quantity: convertedQty,
                  previous_stock: invItem.current_stock,
                  new_stock: newStock,
                  notes: `Auto-deducted for order ${orderNumber} (${item.quantity || 1}x ${menuItem.name}: ${recipeQty}${ingredient.unit} → ${convertedQty.toFixed(3)}${invItem.unit})`,
                  reference_id: orderNumber,
                });
              }
            }
          } catch (err) {
            console.error('Error deducting ingredients:', err);
          }
        }
      }

      return newOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-inventory'] });
      toast({ title: 'Restaurant order created' });
      logActivity({ actionType: 'create', module: 'restaurant', description: `created order ${data.order_number}`, recordType: 'order', recordId: data.id, newData: data as unknown as Json });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: order } = await supabase.from('restaurant_orders').select('*').eq('id', id).single();
      if (!order) throw new Error('Order not found');
      
      // Soft delete: Set all amounts to zero and mark as cancelled
      const { data: updatedOrder, error: orderError } = await supabase
        .from('restaurant_orders')
        .update({ 
          status: 'cancelled',
          subtotal: 0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 0,
          notes: `[CANCELLED - ${reason}] ${order.notes || ''}`
        })
        .eq('id', id)
        .select()
        .single();
      if (orderError) throw orderError;
      
      // Set order item amounts to zero but keep them for record
      await supabase
        .from('restaurant_order_items')
        .update({ unit_price: 0, total_price: 0 })
        .eq('order_id', id);
      
      return { order, updatedOrder, reason };
    },
    onSuccess: ({ order, reason }) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      toast({ title: 'Order cancelled and zeroed' });
      if (order) {
        logActivity({ 
          actionType: 'delete', 
          module: 'restaurant', 
          description: `cancelled order ${order.order_number} - Reason: ${reason} (original total: ${order.total_amount})`, 
          recordType: 'order',
          recordId: order.id,
          oldData: order as unknown as Json
        });
      }
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: oldData } = await supabase.from('restaurant_orders').select('*').eq('id', id).single();
      
      const { data, error } = await supabase
        .from('restaurant_orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { newData: data, oldData };
    },
    onSuccess: ({ newData, oldData }) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      if (oldData && newData) {
        logActivity({ 
          actionType: 'edit', 
          module: 'restaurant', 
          description: `updated order ${newData.order_number} status from "${oldData.status}" to "${newData.status}"`, 
          recordType: 'order', 
          recordId: newData.id,
          oldData: oldData as unknown as Json,
          newData: newData as unknown as Json 
        });
      }
    },
  });

  const deleteInventory = useMutation({
    mutationFn: async (id: string) => {
      const { data: item } = await supabase.from('restaurant_inventory').select('*').eq('id', id).single();
      const { error } = await supabase.from('restaurant_inventory').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-inventory'] });
      toast({ title: 'Inventory item deleted' });
      if (data) {
        logActivity({ actionType: 'delete', module: 'restaurant', description: `deleted inventory item "${data.name}"`, recordType: 'inventory', oldData: data as unknown as Json });
      }
    },
  });

  const deleteMenuItem = useMutation({
    mutationFn: async (id: string) => {
      const { data: item } = await supabase.from('restaurant_menu_items').select('*').eq('id', id).single();
      const { error } = await (supabase.from('restaurant_menu_items').update({ is_available: false }).eq('id', id) as any);
      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu'] });
      toast({ title: 'Menu item deleted' });
      if (data) {
        logActivity({ actionType: 'delete', module: 'restaurant', description: `deleted menu item "${data.name}"`, recordType: 'menu', oldData: data as unknown as Json });
      }
    },
  });

  const bulkAddInventory = useMutation({
    mutationFn: async (items: KitchenInventoryInsert[]) => {
      const { data: existing } = await supabase.from('restaurant_inventory').select('name').eq('is_active', true);
      const existingNames = new Set((existing || []).map(i => i.name.toLowerCase()));
      const newItems = items.filter(item => !existingNames.has(item.name.toLowerCase()));
      
      if (newItems.length === 0) return { inserted: 0, skipped: items.length };
      
      const { data, error } = await supabase.from('restaurant_inventory').insert(newItems).select();
      if (error) throw error;
      return { inserted: data.length, skipped: items.length - newItems.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-inventory'] });
      toast({ title: `Imported ${result.inserted} items${result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : ''}` });
      logActivity({ actionType: 'create', module: 'restaurant', description: `bulk imported ${result.inserted} inventory items`, recordType: 'inventory' });
    },
    onError: () => {
      toast({ title: 'Failed to import items', variant: 'destructive' });
    },
  });

  const addTransaction = useMutation({
    mutationFn: async (transaction: { inventory_id: string; transaction_type: string; quantity: number; notes?: string }) => {
      const { data: item } = await supabase.from('restaurant_inventory').select('*').eq('id', transaction.inventory_id).single();
      if (!item) throw new Error('Item not found');
      
      const isAdd = ['purchase', 'transfer_in', 'adjustment', 'return'].includes(transaction.transaction_type);
      const newStock = isAdd ? item.current_stock + transaction.quantity : item.current_stock - transaction.quantity;
      
      const { error: updateError } = await supabase.from('restaurant_inventory').update({ current_stock: newStock }).eq('id', transaction.inventory_id);
      if (updateError) throw updateError;
      
      return { item, newStock, transaction };
    },
    onSuccess: ({ item, newStock, transaction }) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-inventory'] });
      toast({ title: 'Stock updated successfully' });
      
      const transactionTypeLabels: Record<string, string> = {
        purchase: 'Purchase/Restock',
        consumption: 'Consumption',
        wastage: 'Wastage',
        transfer_in: 'Transfer In',
        transfer_out: 'Transfer Out',
        adjustment: 'Stock Adjustment',
        return: 'Return',
      };
      const typeLabel = transactionTypeLabels[transaction.transaction_type] || transaction.transaction_type;
      const changeDirection = ['purchase', 'transfer_in', 'adjustment', 'return'].includes(transaction.transaction_type) ? '+' : '-';
      
      logActivity({ 
        actionType: 'edit', 
        module: 'restaurant', 
        description: `${typeLabel}: "${item.name}" stock changed from ${item.current_stock} ${item.unit || 'pcs'} to ${newStock} ${item.unit || 'pcs'} (${changeDirection}${transaction.quantity} ${item.unit || 'pcs'})${transaction.notes ? ` - Reason: ${transaction.notes}` : ''}`, 
        recordType: 'inventory',
        recordId: item.id,
      });
    },
  });

  const bulkAddMenuItems = useMutation({
    mutationFn: async (items: { name: string; category: string; price: number; description: string; ingredients: Json }[]) => {
      const { data: existing } = await supabase.from('restaurant_menu_items').select('name').eq('is_available', true);
      const existingNames = new Set((existing || []).map(i => i.name.toLowerCase()));
      const newItems = items.filter(item => !existingNames.has(item.name.toLowerCase()));
      
      if (newItems.length === 0) return { inserted: 0, skipped: items.length };
      
      const insertData = newItems.map(item => ({
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description || null,
        ingredients: item.ingredients,
        is_available: true,
      }));
      
      const { data, error } = await supabase.from('restaurant_menu_items').insert(insertData).select();
      if (error) throw error;
      return { inserted: data.length, skipped: items.length - newItems.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu'] });
      toast({ title: `Imported ${result.inserted} menu items${result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : ''}` });
      logActivity({ actionType: 'create', module: 'restaurant', description: `bulk imported ${result.inserted} menu items`, recordType: 'menu' });
    },
    onError: () => {
      toast({ title: 'Failed to import menu items', variant: 'destructive' });
    },
  });

  // Function to deduct ingredients from inventory when an order is placed
  const deductIngredients = async (menuItemId: string, quantity: number, orderNumber: string) => {
    // Get the menu item with its recipe
    const { data: menuItem } = await supabase
      .from('restaurant_menu_items')
      .select('name, ingredients')
      .eq('id', menuItemId)
      .single();
    
    if (!menuItem || !menuItem.ingredients) return;
    
    const ingredients = menuItem.ingredients as { inventory_id: string; inventory_name: string; quantity: number; unit: string }[];
    if (!Array.isArray(ingredients) || ingredients.length === 0) return;
    
    // Deduct each ingredient from inventory
    for (const ingredient of ingredients) {
      if (!ingredient.inventory_id) continue;
      
      const deductQty = ingredient.quantity * quantity;
      
      // Get current stock
      const { data: invItem } = await supabase
        .from('restaurant_inventory')
        .select('id, name, current_stock')
        .eq('id', ingredient.inventory_id)
        .single();
      
      if (!invItem) continue;
      
      const newStock = Math.max(0, invItem.current_stock - deductQty);
      
      // Update inventory
      await supabase
        .from('restaurant_inventory')
        .update({ current_stock: newStock })
        .eq('id', ingredient.inventory_id);
      
      // Log transaction
      await supabase.from('restaurant_inventory_transactions').insert({
        inventory_id: ingredient.inventory_id,
        transaction_type: 'consumption',
        quantity: deductQty,
        previous_stock: invItem.current_stock,
        new_stock: newStock,
        notes: `Auto-deducted for order ${orderNumber} (${quantity}x ${menuItem.name})`,
        reference_id: orderNumber,
      });
    }
  };

  const updateOrder = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; order_type?: string; table_number?: string; notes?: string; status?: string; subtotal?: number; tax_amount?: number; discount_amount?: number; total_amount?: number; payment_status?: string; payment_mode?: string }) => {
      const { data: oldData } = await supabase.from('restaurant_orders').select('*').eq('id', id).single();
      
      const { data, error } = await supabase
        .from('restaurant_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { newData: data, oldData };
    },
    onSuccess: ({ newData, oldData }) => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      toast({ title: 'Order updated successfully' });
      if (oldData && newData) {
        logActivity({ 
          actionType: 'edit', 
          module: 'restaurant', 
          description: `updated order ${newData.order_number}`, 
          recordType: 'order', 
          recordId: newData.id,
          oldData: oldData as unknown as Json,
          newData: newData as unknown as Json 
        });
      }
    },
  });

  return { 
    addInventory, 
    updateInventory, 
    addMenuItem, 
    updateMenuItem, 
    createOrder, 
    updateOrder,
    updateOrderStatus, 
    deleteOrder, 
    deleteInventory, 
    deleteMenuItem, 
    bulkAddInventory, 
    addTransaction, 
    bulkAddMenuItems,
    deductIngredients,
  };
}

// =============================================
// SPA HOOKS
// =============================================

export function useSpaInventory() {
  return useQuery({
    queryKey: ['spa-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spa_inventory')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as DepartmentInventory[];
    },
  });
}

export function useSpaServices() {
  return useQuery({
    queryKey: ['spa-services'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('spa_services')
        .select('*')
        .eq('is_available', true)
        .order('category')
        .order('name') as any);
      if (error) throw error;
      return data as SpaService[];
    },
  });
}

export function useSpaBookings(status?: string) {
  return useQuery({
    queryKey: ['spa-bookings', status],
    queryFn: async () => {
      let query = supabase
        .from('spa_bookings')
        .select('*')
        .order('booking_date', { ascending: false });
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as SpaBooking[];
    },
  });
}

export function useSpaMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  const addInventory = useMutation({
    mutationFn: async (item: KitchenInventoryInsert) => {
      const { data, error } = await supabase
        .from('spa_inventory')
        .insert([item])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spa-inventory'] });
      toast({ title: 'Item added to spa inventory' });
      logActivity({ actionType: 'create', module: 'spa', description: `added inventory item "${data.name}"`, recordType: 'inventory', newData: data as unknown as Json });
    },
  });

  const addService = useMutation({
    mutationFn: async (service: { name: string; category: string; price?: number; description?: string | null; duration_minutes?: number; is_available?: boolean }) => {
      const { data, error } = await supabase
        .from('spa_services')
        .insert([service])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spa-services'] });
      toast({ title: 'Service added' });
      logActivity({ actionType: 'create', module: 'spa', description: `added service "${data.name}"`, recordType: 'service', newData: data as unknown as Json });
    },
  });

  const createBooking = useMutation({
    mutationFn: async (booking: Partial<SpaBooking> & { booking_date: string; start_time: string }) => {
      const { data: bookingNumber } = await supabase.rpc('generate_spa_booking_number');
      
      const { data, error } = await supabase
        .from('spa_bookings')
        .insert([{
          booking_number: bookingNumber,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          guest_id: booking.guest_id,
          room_id: booking.room_id,
          service_id: booking.service_id,
          therapist_name: booking.therapist_name,
          status: booking.status || 'scheduled',
          subtotal: booking.subtotal || 0,
          tax_amount: booking.tax_amount || 0,
          discount_amount: booking.discount_amount || 0,
          total_amount: booking.total_amount || 0,
          payment_status: booking.payment_status || 'pending',
          notes: booking.notes,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spa-bookings'] });
      toast({ title: 'Spa booking created' });
      logActivity({ actionType: 'create', module: 'spa', description: `created booking ${data.booking_number}`, recordType: 'booking', recordId: data.id, newData: data as unknown as Json });
    },
  });

  const updateInventory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DepartmentInventory> & { id: string }) => {
      const { data: oldData } = await supabase.from('spa_inventory').select('*').eq('id', id).single();
      
      const { data, error } = await supabase
        .from('spa_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { newData: data, oldData };
    },
    onSuccess: ({ newData, oldData }) => {
      queryClient.invalidateQueries({ queryKey: ['spa-inventory'] });
      toast({ title: 'Spa inventory updated' });
      logActivity({ 
        actionType: 'edit', 
        module: 'spa', 
        description: `updated inventory item "${newData.name}"`, 
        recordType: 'inventory', 
        oldData: oldData as unknown as Json,
        newData: newData as unknown as Json 
      });
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; category?: string; price?: number; description?: string | null; duration_minutes?: number; is_available?: boolean }) => {
      const { data: oldData } = await supabase.from('spa_services').select('*').eq('id', id).single();
      
      const { data, error } = await supabase
        .from('spa_services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { newData: data, oldData };
    },
    onSuccess: ({ newData, oldData }) => {
      queryClient.invalidateQueries({ queryKey: ['spa-services'] });
      toast({ title: 'Service updated' });
      logActivity({ 
        actionType: 'edit', 
        module: 'spa', 
        description: `updated service "${newData.name}"`, 
        recordType: 'service', 
        oldData: oldData as unknown as Json,
        newData: newData as unknown as Json 
      });
    },
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: oldData } = await supabase.from('spa_bookings').select('*').eq('id', id).single();
      
      const { data, error } = await supabase
        .from('spa_bookings')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { newData: data, oldData };
    },
    onSuccess: ({ newData, oldData }) => {
      queryClient.invalidateQueries({ queryKey: ['spa-bookings'] });
      toast({ title: 'Booking updated' });
      if (oldData && newData) {
        logActivity({ 
          actionType: 'edit', 
          module: 'spa', 
          description: `updated booking ${newData.booking_number} status from "${oldData.status}" to "${newData.status}"`, 
          recordType: 'booking', 
          recordId: newData.id,
          oldData: oldData as unknown as Json,
          newData: newData as unknown as Json 
        });
      }
    },
  });

  const updateBookingPayment = useMutation({
    mutationFn: async ({ id, payment_status, payment_mode }: { id: string; payment_status: string; payment_mode: string }) => {
      const { data: oldData } = await supabase.from('spa_bookings').select('*').eq('id', id).single();
      
      const { data, error } = await supabase
        .from('spa_bookings')
        .update({ payment_status, payment_mode })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { newData: data, oldData };
    },
    onSuccess: ({ newData, oldData }) => {
      queryClient.invalidateQueries({ queryKey: ['spa-bookings'] });
      toast({ title: 'Payment recorded successfully' });
      if (oldData && newData) {
        logActivity({ 
          actionType: 'update', 
          module: 'spa', 
          description: `recorded payment for booking ${newData.booking_number} via ${newData.payment_mode}`, 
          recordType: 'booking', 
          recordId: newData.id,
          oldData: oldData as unknown as Json,
          newData: newData as unknown as Json 
        });
      }
    },
    onError: () => {
      toast({ title: 'Failed to record payment', variant: 'destructive' });
    },
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { data: booking } = await supabase.from('spa_bookings').select('*').eq('id', id).single();
      const { error } = await supabase.from('spa_bookings').delete().eq('id', id);
      if (error) throw error;
      return booking;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spa-bookings'] });
      toast({ title: 'Booking deleted' });
      if (data) {
        logActivity({ actionType: 'delete', module: 'spa', description: `deleted booking ${data.booking_number}`, recordType: 'booking', oldData: data as unknown as Json });
      }
    },
  });

  const deleteInventory = useMutation({
    mutationFn: async (id: string) => {
      const { data: item } = await supabase.from('spa_inventory').select('*').eq('id', id).single();
      const { error } = await supabase.from('spa_inventory').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spa-inventory'] });
      toast({ title: 'Inventory item deleted' });
      if (data) {
        logActivity({ actionType: 'delete', module: 'spa', description: `deleted inventory item "${data.name}"`, recordType: 'inventory', oldData: data as unknown as Json });
      }
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { data: item } = await supabase.from('spa_services').select('*').eq('id', id).single();
      const { error } = await (supabase.from('spa_services').update({ is_available: false }).eq('id', id) as any);
      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spa-services'] });
      toast({ title: 'Service deleted' });
      if (data) {
        logActivity({ actionType: 'delete', module: 'spa', description: `deleted service "${data.name}"`, recordType: 'service', oldData: data as unknown as Json });
      }
    },
  });

  const bulkAddInventory = useMutation({
    mutationFn: async (items: KitchenInventoryInsert[]) => {
      const { data: existing } = await supabase.from('spa_inventory').select('name').eq('is_active', true);
      const existingNames = new Set((existing || []).map(i => i.name.toLowerCase()));
      const newItems = items.filter(item => !existingNames.has(item.name.toLowerCase()));
      
      if (newItems.length === 0) return { inserted: 0, skipped: items.length };
      
      const { data, error } = await supabase.from('spa_inventory').insert(newItems).select();
      if (error) throw error;
      return { inserted: data.length, skipped: items.length - newItems.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['spa-inventory'] });
      toast({ title: `Imported ${result.inserted} items${result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : ''}` });
      logActivity({ actionType: 'create', module: 'spa', description: `bulk imported ${result.inserted} inventory items`, recordType: 'inventory' });
    },
    onError: () => {
      toast({ title: 'Failed to import items', variant: 'destructive' });
    },
  });

  const addTransaction = useMutation({
    mutationFn: async (transaction: { inventory_id: string; transaction_type: string; quantity: number; notes?: string }) => {
      const { data: item } = await supabase.from('spa_inventory').select('*').eq('id', transaction.inventory_id).single();
      if (!item) throw new Error('Item not found');
      
      const isAdd = ['purchase', 'transfer_in', 'adjustment', 'return'].includes(transaction.transaction_type);
      const newStock = isAdd ? item.current_stock + transaction.quantity : item.current_stock - transaction.quantity;
      
      const { error: updateError } = await supabase.from('spa_inventory').update({ current_stock: newStock }).eq('id', transaction.inventory_id);
      if (updateError) throw updateError;
      
      return { item, newStock, transaction };
    },
    onSuccess: ({ item, newStock, transaction }) => {
      queryClient.invalidateQueries({ queryKey: ['spa-inventory'] });
      toast({ title: 'Stock updated successfully' });
      
      const transactionTypeLabels: Record<string, string> = {
        purchase: 'Purchase/Restock',
        consumption: 'Consumption',
        wastage: 'Wastage',
        transfer_in: 'Transfer In',
        transfer_out: 'Transfer Out',
        adjustment: 'Stock Adjustment',
        return: 'Return',
      };
      const typeLabel = transactionTypeLabels[transaction.transaction_type] || transaction.transaction_type;
      const changeDirection = ['purchase', 'transfer_in', 'adjustment', 'return'].includes(transaction.transaction_type) ? '+' : '-';
      
      logActivity({ 
        actionType: 'edit', 
        module: 'spa', 
        description: `${typeLabel}: "${item.name}" stock changed from ${item.current_stock} ${item.unit || 'pcs'} to ${newStock} ${item.unit || 'pcs'} (${changeDirection}${transaction.quantity} ${item.unit || 'pcs'})${transaction.notes ? ` - Reason: ${transaction.notes}` : ''}`, 
        recordType: 'inventory',
        recordId: item.id,
      });
    },
  });

  return { addInventory, updateInventory, addService, updateService, createBooking, updateBookingStatus, updateBookingPayment, deleteBooking, deleteInventory, deleteService, bulkAddInventory, addTransaction };
}

// =============================================
// HOUSEKEEPING HOOKS
// =============================================

export function useHousekeepingInventory() {
  return useQuery({
    queryKey: ['housekeeping-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('housekeeping_inventory')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as DepartmentInventory[];
    },
  });
}

export function useHousekeepingTasks(status?: string) {
  return useQuery({
    queryKey: ['housekeeping-tasks', status],
    queryFn: async () => {
      let query = supabase
        .from('housekeeping_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as HousekeepingTask[];
    },
  });
}

export function useHousekeepingMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  const addInventory = useMutation({
    mutationFn: async (item: { name: string; category: string; unit?: string; current_stock?: number; min_stock_level?: number; cost_price?: number; supplier?: string | null; sku?: string | null }) => {
      const { data, error } = await supabase
        .from('housekeeping_inventory')
        .insert([item])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-inventory'] });
      toast({ title: 'Item added to housekeeping inventory' });
      logActivity({ actionType: 'create', module: 'housekeeping', description: `added inventory item "${data.name}"`, recordType: 'inventory', newData: data as unknown as Json });
    },
  });

  const createTask = useMutation({
    mutationFn: async (task: Partial<HousekeepingTask>) => {
      const { data: taskNumber } = await supabase.rpc('generate_housekeeping_task_number');
      
      const { data, error } = await supabase
        .from('housekeeping_tasks')
        .insert([{
          task_number: taskNumber,
          room_id: task.room_id,
          task_type: task.task_type || 'cleaning',
          priority: task.priority || 'normal',
          status: task.status || 'pending',
          assigned_to: task.assigned_to,
          assigned_name: task.assigned_name,
          scheduled_date: task.scheduled_date,
          notes: task.notes,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] });
      toast({ title: 'Housekeeping task created' });
      logActivity({ actionType: 'create', module: 'housekeeping', description: `created task ${data.task_number}`, recordType: 'task', recordId: data.id, newData: data as unknown as Json });
    },
  });

  const updateInventory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DepartmentInventory> & { id: string }) => {
      const { data: oldData } = await supabase.from('housekeeping_inventory').select('*').eq('id', id).single();
      
      const { data, error } = await supabase
        .from('housekeeping_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { newData: data, oldData };
    },
    onSuccess: ({ newData, oldData }) => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-inventory'] });
      toast({ title: 'Housekeeping inventory updated' });
      logActivity({ 
        actionType: 'edit', 
        module: 'housekeeping', 
        description: `updated inventory item "${newData.name}"`, 
        recordType: 'inventory', 
        oldData: oldData as unknown as Json,
        newData: newData as unknown as Json 
      });
    },
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: oldData } = await supabase.from('housekeeping_tasks').select('*').eq('id', id).single();
      
      const updates: { status: string; started_at?: string; completed_at?: string } = { status };
      if (status === 'in_progress') updates.started_at = new Date().toISOString();
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('housekeeping_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { newData: data, oldData };
    },
    onSuccess: ({ newData, oldData }) => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] });
      toast({ title: 'Task updated' });
      if (oldData && newData) {
        logActivity({ 
          actionType: 'edit', 
          module: 'housekeeping', 
          description: `updated task ${newData.task_number} status from "${oldData.status}" to "${newData.status}"`, 
          recordType: 'task', 
          recordId: newData.id,
          oldData: oldData as unknown as Json,
          newData: newData as unknown as Json 
        });
      }
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { data: task } = await supabase.from('housekeeping_tasks').select('*').eq('id', id).single();
      const { error } = await supabase.from('housekeeping_tasks').delete().eq('id', id);
      if (error) throw error;
      return task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] });
      toast({ title: 'Task deleted' });
      if (data) {
        logActivity({ actionType: 'delete', module: 'housekeeping', description: `deleted task ${data.task_number}`, recordType: 'task', oldData: data as unknown as Json });
      }
    },
  });

  const deleteInventory = useMutation({
    mutationFn: async (id: string) => {
      const { data: item } = await supabase.from('housekeeping_inventory').select('*').eq('id', id).single();
      const { error } = await supabase.from('housekeeping_inventory').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-inventory'] });
      toast({ title: 'Inventory item deleted' });
      if (data) {
        logActivity({ actionType: 'delete', module: 'housekeeping', description: `deleted inventory item "${data.name}"`, recordType: 'inventory', oldData: data as unknown as Json });
      }
    },
  });

  const bulkAddInventory = useMutation({
    mutationFn: async (items: { name: string; category: string; unit?: string; current_stock?: number; min_stock_level?: number; cost_price?: number }[]) => {
      const { data: existing } = await supabase.from('housekeeping_inventory').select('name').eq('is_active', true);
      const existingNames = new Set((existing || []).map(i => i.name.toLowerCase()));
      const newItems = items.filter(item => !existingNames.has(item.name.toLowerCase()));
      
      if (newItems.length === 0) return { inserted: 0, skipped: items.length };
      
      const { data, error } = await supabase.from('housekeeping_inventory').insert(newItems).select();
      if (error) throw error;
      return { inserted: data.length, skipped: items.length - newItems.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-inventory'] });
      toast({ title: `Imported ${result.inserted} items${result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : ''}` });
      logActivity({ actionType: 'create', module: 'housekeeping', description: `bulk imported ${result.inserted} inventory items`, recordType: 'inventory' });
    },
    onError: () => {
      toast({ title: 'Failed to import items', variant: 'destructive' });
    },
  });

  const addTransaction = useMutation({
    mutationFn: async (transaction: { inventory_id: string; transaction_type: string; quantity: number; notes?: string }) => {
      const { data: item } = await supabase.from('housekeeping_inventory').select('*').eq('id', transaction.inventory_id).single();
      if (!item) throw new Error('Item not found');
      
      const isAdd = ['purchase', 'transfer_in', 'adjustment', 'return'].includes(transaction.transaction_type);
      const newStock = isAdd ? item.current_stock + transaction.quantity : item.current_stock - transaction.quantity;
      
      const { error: updateError } = await supabase.from('housekeeping_inventory').update({ current_stock: newStock }).eq('id', transaction.inventory_id);
      if (updateError) throw updateError;
      
      return { item, newStock, transaction };
    },
    onSuccess: ({ item, newStock, transaction }) => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-inventory'] });
      toast({ title: 'Stock updated successfully' });
      
      const transactionTypeLabels: Record<string, string> = {
        purchase: 'Purchase/Restock',
        consumption: 'Consumption',
        wastage: 'Wastage',
        transfer_in: 'Transfer In',
        transfer_out: 'Transfer Out',
        adjustment: 'Stock Adjustment',
        return: 'Return',
      };
      const typeLabel = transactionTypeLabels[transaction.transaction_type] || transaction.transaction_type;
      const changeDirection = ['purchase', 'transfer_in', 'adjustment', 'return'].includes(transaction.transaction_type) ? '+' : '-';
      
      logActivity({ 
        actionType: 'edit', 
        module: 'housekeeping', 
        description: `${typeLabel}: "${item.name}" stock changed from ${item.current_stock} ${item.unit || 'pcs'} to ${newStock} ${item.unit || 'pcs'} (${changeDirection}${transaction.quantity} ${item.unit || 'pcs'})${transaction.notes ? ` - Reason: ${transaction.notes}` : ''}`, 
        recordType: 'inventory',
        recordId: item.id,
      });
    },
  });

  return { addInventory, updateInventory, createTask, updateTaskStatus, deleteTask, deleteInventory, bulkAddInventory, addTransaction };
}
