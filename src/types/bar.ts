// Bar types aligned with actual Supabase database schema

export interface BarInventory {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  current_stock: number | null;
  min_stock_level: number | null;
  cost_price: number | null;
  selling_price: number | null;
  price: number | null;
  quantity: number;
  supplier: string | null;
  sku: string | null;
  last_restocked: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// bar_menu_items table - no is_active column, uses is_available
export interface BarMenuItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

// bar_orders table
export interface BarOrder {
  id: string;
  order_number: string | null;
  order_type: string;
  table_number: string | null;
  guest_id: string | null;
  room_id: string | null;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_status: string | null;
  payment_mode: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// bar_order_items table
export interface BarOrderItem {
  id: string;
  order_id: string | null;
  menu_item_id: string | null;
  item_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  created_at: string;
}

export interface BarInventoryTransaction {
  id: string;
  inventory_id: string | null;
  transaction_type: string;
  quantity: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const BAR_CATEGORIES = [
  { value: 'cocktails', label: 'Cocktails' },
  { value: 'mocktails', label: 'Mocktails' },
  { value: 'whisky', label: 'Whisky' },
  { value: 'vodka', label: 'Vodka' },
  { value: 'rum', label: 'Rum' },
  { value: 'gin', label: 'Gin' },
  { value: 'brandy', label: 'Brandy' },
  { value: 'beer', label: 'Beer' },
  { value: 'wine', label: 'Wine' },
  { value: 'shots', label: 'Shots' },
  { value: 'soft_drinks', label: 'Soft Drinks' },
  { value: 'snacks', label: 'Snacks' },
] as const;

export const INVENTORY_CATEGORIES = [
  { value: 'spirits', label: 'Spirits' },
  { value: 'beer', label: 'Beer' },
  { value: 'wine', label: 'Wine' },
  { value: 'mixer', label: 'Mixers' },
  { value: 'garnish', label: 'Garnishes' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'other', label: 'Other' },
] as const;

// Re-export from centralized units - keep for backwards compatibility
export { BAR_UNITS as INVENTORY_UNITS } from '@/constants/inventoryUnits';

export interface CartItem extends BarMenuItem {
  cartQuantity: number;
  cartNotes?: string;
}
