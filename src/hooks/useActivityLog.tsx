import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Json } from '@/integrations/supabase/types';

interface LogActivityParams {
  actionType: 'create' | 'edit' | 'delete' | 'view' | 'update_status' | 'update';
  module: string;
  description: string;
  recordId?: string;
  recordType?: string;
  oldData?: Json;
  newData?: Json;
}

// Format order items into a readable list
function formatOrderItems(items: unknown[]): string {
  if (!items || items.length === 0) return '';
  
  const itemDescriptions = items.map(item => {
    const i = item as { item_name?: string; quantity?: number; unit_price?: number };
    const name = i.item_name || 'Unknown item';
    const qty = i.quantity || 1;
    const price = i.unit_price;
    if (price !== undefined) {
      return `${qty}x ${name} @₹${price}`;
    }
    return `${qty}x ${name}`;
  });
  
  return itemDescriptions.join(', ');
}

// Format complete order description
function formatOrderDescription(order: Record<string, unknown>, items?: unknown[]): string {
  const parts: string[] = [];
  
  // Order type
  if (order.order_type) {
    const type = String(order.order_type).replace(/_/g, ' ');
    parts.push(`Type: ${type}`);
  }
  
  // Table number
  if (order.table_number) {
    parts.push(`Table: ${order.table_number}`);
  }
  
  // Status
  if (order.status) {
    parts.push(`Status: ${order.status}`);
  }
  
  // Payment
  if (order.payment_status) {
    parts.push(`Payment: ${order.payment_status}`);
  }
  if (order.payment_mode) {
    parts.push(`Payment Mode: ${order.payment_mode}`);
  }
  
  // Total amount
  if (order.total_amount !== undefined && order.total_amount !== null) {
    parts.push(`Total: ₹${order.total_amount}`);
  }
  
  // Items - show complete list
  const orderItems = items || (order.items as unknown[]) || (order.order_items as unknown[]);
  if (orderItems && Array.isArray(orderItems) && orderItems.length > 0) {
    parts.push(`Items: ${formatOrderItems(orderItems)}`);
  }
  
  // Notes
  if (order.notes) {
    parts.push(`Notes: ${order.notes}`);
  }
  
  return parts.join(' | ');
}

// Field labels for human-readable output across all modules
const fieldLabels: Record<string, string> = {
  // Common fields
  name: 'name',
  price: 'price',
  category: 'category',
  status: 'status',
  stock: 'stock',
  quantity: 'quantity',
  description: 'description',
  unit: 'unit',
  notes: 'notes',
  priority: 'priority',
  
  // Menu & Items
  is_available: 'availability',
  is_vegetarian: 'vegetarian status',
  is_vegan: 'vegan status',
  is_gluten_free: 'gluten-free status',
  is_spicy: 'spicy status',
  is_signature: 'signature item',
  is_recommended: 'recommended status',
  preparation_time: 'preparation time',
  serving_size: 'serving size',
  calories: 'calories',
  ingredients: 'ingredients',
  allergens: 'allergens',
  
  // Pricing & Finance
  cost_price: 'cost price',
  selling_price: 'selling price',
  base_price: 'base price',
  total_amount: 'total amount',
  subtotal: 'subtotal',
  tax_amount: 'tax amount',
  tax_rate: 'tax rate',
  discount: 'discount',
  discount_amount: 'discount amount',
  service_charge: 'service charge',
  grand_total: 'grand total',
  
  // Inventory
  reorder_level: 'reorder level',
  min_stock: 'minimum stock',
  max_stock: 'maximum stock',
  current_stock: 'current stock',
  opening_stock: 'opening stock',
  stock_quantity: 'stock quantity',
  supplier: 'supplier',
  batch_number: 'batch number',
  expiry_date: 'expiry date',
  purchase_date: 'purchase date',
  
  // Orders
  order_type: 'order type',
  order_status: 'order status',
  order_number: 'order number',
  payment_status: 'payment status',
  payment_method: 'payment method',
  order_items: 'order items',
  special_instructions: 'special instructions',
  
  // Restaurant & Bar
  table_number: 'table number',
  table_name: 'table name',
  seat_count: 'seat count',
  section: 'section',
  floor: 'floor',
  covers: 'covers',
  pax: 'number of guests',
  
  // Room & Guest
  room_number: 'room number',
  room_type: 'room type',
  guest_name: 'guest name',
  guest_email: 'guest email',
  guest_phone: 'guest phone',
  check_in_date: 'check-in date',
  check_out_date: 'check-out date',
  booking_source: 'booking source',
  
  // Housekeeping
  task_type: 'task type',
  assigned_to: 'assigned to',
  assigned_by: 'assigned by',
  due_date: 'due date',
  completed_at: 'completed at',
  cleaning_status: 'cleaning status',
  inspection_status: 'inspection status',
  
  // Spa
  service_name: 'service name',
  service_type: 'service type',
  therapist: 'therapist',
  therapist_name: 'therapist name',
  duration: 'duration',
  booking_time: 'booking time',
  appointment_date: 'appointment date',
  treatment_room: 'treatment room',
  
  // Staff & Users
  full_name: 'full name',
  email: 'email',
  phone: 'phone',
  role: 'role',
  department: 'department',
  shift: 'shift',
  is_active: 'active status',
  
  // Settings & Config
  tax_name: 'tax name',
  tax_percentage: 'tax percentage',
  is_inclusive: 'tax inclusive',
  is_default: 'default status',
  display_order: 'display order',
  
  // Recipe
  recipe_name: 'recipe name',
  recipe_yield: 'recipe yield',
  recipe_cost: 'recipe cost',
  food_cost_percentage: 'food cost percentage',
};

// Format a value for display
function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return 'empty';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (typeof value === 'number') {
    // Price fields
    if (key.includes('price') || key.includes('amount') || key.includes('cost') || key === 'total') {
      return `₹${value.toLocaleString('en-IN')}`;
    }
    // Stock/quantity fields
    if (key.includes('stock') || key.includes('quantity') || key.includes('level')) {
      return `${value} units`;
    }
    return value.toString();
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return 'none';
    if (value.length <= 3) return value.join(', ');
    return `${value.length} items`;
  }
  
  if (typeof value === 'object') {
    return 'updated';
  }
  
  // Capitalize first letter for string values
  const str = String(value);
  if (str.length > 50) {
    return `"${str.substring(0, 47)}..."`;
  }
  return `"${str}"`;
}

// Get human-readable field label
function getFieldLabel(key: string): string {
  if (fieldLabels[key]) return fieldLabels[key];
  // Convert snake_case to readable format
  return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLowerCase().trim();
}

// Compare oldData and newData to generate human-readable changes
function formatChanges(oldData: Json, newData: Json, recordType?: string): string {
  if (!oldData && !newData) return '';
  
  const changes: string[] = [];
  
  // Handle creation (no oldData)
  if (!oldData && newData && typeof newData === 'object' && !Array.isArray(newData)) {
    const newObj = newData as Record<string, unknown>;
    
    // Check if this is an order record - use complete order formatter
    const isOrder = recordType === 'order' || 
                    recordType === 'bar_orders' || 
                    'order_number' in newObj || 
                    'order_type' in newObj;
    
    if (isOrder) {
      return formatOrderDescription(newObj, newObj.items as unknown[] | undefined);
    }
    
    const relevantFields = Object.keys(newObj).filter(key => 
      !['id', 'created_at', 'updated_at', 'user_id', 'hotel_id', 'items'].includes(key) &&
      newObj[key] !== null && newObj[key] !== undefined
    );
    if (relevantFields.length > 0) {
      const preview = relevantFields.slice(0, 3).map(key => {
        const label = getFieldLabel(key);
        return `${label}: ${formatValue(key, newObj[key])}`;
      });
      if (relevantFields.length > 3) {
        preview.push(`+${relevantFields.length - 3} more`);
      }
      return preview.join(', ');
    }
    return '';
  }
  
  // Handle deletion (no newData)
  if (oldData && !newData && typeof oldData === 'object' && !Array.isArray(oldData)) {
    const oldObj = oldData as Record<string, unknown>;
    if (oldObj.name) return `name: ${formatValue('name', oldObj.name)}`;
    return '';
  }
  
  // Handle updates (compare old vs new)
  if (oldData && newData && typeof oldData === 'object' && typeof newData === 'object' && 
      !Array.isArray(oldData) && !Array.isArray(newData)) {
    const oldObj = oldData as Record<string, unknown>;
    const newObj = newData as Record<string, unknown>;
    
    // Skip metadata fields
    const skipFields = ['id', 'created_at', 'updated_at', 'user_id', 'hotel_id'];
    
    for (const key of Object.keys(newObj)) {
      if (skipFields.includes(key)) continue;
      
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      
      // Check if value actually changed
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        const label = getFieldLabel(key);
        const oldFormatted = formatValue(key, oldVal);
        const newFormatted = formatValue(key, newVal);
        
        if (oldVal === null || oldVal === undefined) {
          changes.push(`set ${label} to ${newFormatted}`);
        } else if (newVal === null || newVal === undefined) {
          changes.push(`removed ${label}`);
        } else {
          changes.push(`${label} from ${oldFormatted} to ${newFormatted}`);
        }
      }
    }
    
    // Check for removed fields
    for (const key of Object.keys(oldObj)) {
      if (skipFields.includes(key)) continue;
      if (!(key in newObj) && oldObj[key] !== null && oldObj[key] !== undefined) {
        const label = getFieldLabel(key);
        changes.push(`removed ${label}`);
      }
    }
  }
  
  if (changes.length === 0) return '';
  if (changes.length === 1) return changes[0];
  if (changes.length <= 3) return changes.join(', ');
  return `${changes.slice(0, 3).join(', ')} (+${changes.length - 3} more changes)`;
}

export function useActivityLog() {
  const { profile, role } = useAuth();

  const logActivity = async ({
    actionType,
    module,
    description,
    recordId,
    recordType,
    oldData,
    newData,
  }: LogActivityParams) => {
    try {
      const userDisplayName = profile?.full_name || profile?.email || 'Unknown User';
      const userRole = role || 'staff';
      
      // Start with base description
      let fullDescription = `${userDisplayName} (${userRole}) ${description}`;
      
      // Add human-readable changes if available
      if (oldData || newData) {
        const changesText = formatChanges(oldData ?? null, newData ?? null, recordType);
        if (changesText) {
          fullDescription += ` - ${changesText}`;
        }
      }

      const { error } = await supabase.from('activity_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
        action_type: actionType,
        module: module,
        description: fullDescription,
        record_id: recordId || null,
        record_type: recordType || null,
      });

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (err) {
      console.error('Activity logging error:', err);
    }
  };

  return { logActivity };
}

// Helper function for simple logging without hook context
export async function logActivityDirect(params: LogActivityParams & { userEmail?: string; userRole?: string }) {
  try {
    let fullDescription = params.description;
    
    // Add human-readable changes if available
    if (params.oldData || params.newData) {
      const changesText = formatChanges(params.oldData ?? null, params.newData ?? null);
      if (changesText) {
        fullDescription += ` - ${changesText}`;
      }
    }

    const { error } = await supabase.from('activity_logs').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id || null,
      action_type: params.actionType,
      module: params.module,
      description: fullDescription,
      record_id: params.recordId || null,
      record_type: params.recordType || null,
    });

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Activity logging error:', err);
  }
}
