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

// Field labels for human-readable output
const fieldLabels: Record<string, string> = {
  name: 'name',
  price: 'price',
  category: 'category',
  status: 'status',
  stock: 'stock',
  quantity: 'quantity',
  is_available: 'availability',
  is_vegetarian: 'vegetarian status',
  is_vegan: 'vegan status',
  description: 'description',
  unit: 'unit',
  reorder_level: 'reorder level',
  cost_price: 'cost price',
  selling_price: 'selling price',
  notes: 'notes',
  room_number: 'room number',
  guest_name: 'guest name',
  table_number: 'table number',
  order_type: 'order type',
  payment_status: 'payment status',
  total_amount: 'total amount',
  tax_rate: 'tax rate',
  discount: 'discount',
  priority: 'priority',
  assigned_to: 'assigned to',
  due_date: 'due date',
  completed_at: 'completed at',
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
function formatChanges(oldData: Json, newData: Json): string {
  if (!oldData && !newData) return '';
  
  const changes: string[] = [];
  
  // Handle creation (no oldData)
  if (!oldData && newData && typeof newData === 'object' && !Array.isArray(newData)) {
    const newObj = newData as Record<string, unknown>;
    const relevantFields = Object.keys(newObj).filter(key => 
      !['id', 'created_at', 'updated_at', 'user_id', 'hotel_id'].includes(key) &&
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
        const changesText = formatChanges(oldData ?? null, newData ?? null);
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
