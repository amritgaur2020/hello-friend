// Shared department types for all operational departments

// Recipe ingredient for menu items
export interface RecipeIngredient {
  inventory_id: string;
  inventory_name: string;
  quantity: number;
  unit: string;
}

export interface DepartmentInventory {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  cost_price: number;
  selling_price?: number;
  supplier: string | null;
  sku: string | null;
  last_restocked: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentMenuItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  image_url: string | null;
  ingredients: RecipeIngredient[] | null;
  is_available: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentOrder {
  id: string;
  order_number: string;
  order_type: string;
  table_number: string | null;
  guest_id: string | null;
  room_id: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_status: string;
  payment_mode: string | null;
  notes: string | null;
  created_by: string | null;
  served_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  created_at: string;
}

export interface DepartmentInventoryTransaction {
  id: string;
  inventory_id: string;
  transaction_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  notes: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
}

// Spa-specific types
export interface SpaService {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  is_available: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpaBooking {
  id: string;
  booking_number: string;
  guest_id: string | null;
  room_id: string | null;
  service_id: string | null;
  therapist_name: string | null;
  booking_date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_status: string;
  payment_mode: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Housekeeping-specific types
export interface HousekeepingTask {
  id: string;
  task_number: string;
  room_id: string | null;
  task_type: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  assigned_name: string | null;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Department configuration type
export interface DepartmentConfig {
  name: string;
  displayName: string;
  module: string;
  icon: string;
  color: string;
  tables: {
    inventory: string;
    menu?: string;
    orders?: string;
    orderItems?: string;
    services?: string;
    bookings?: string;
    tasks?: string;
    transactions: string;
  };
  orderNumberGenerator?: string;
}

export const DEPARTMENT_CONFIGS: Record<string, DepartmentConfig> = {
  bar: {
    name: 'bar',
    displayName: 'Bar',
    module: 'bar',
    icon: 'Wine',
    color: 'purple',
    tables: {
      inventory: 'bar_inventory',
      menu: 'bar_menu_items',
      orders: 'bar_orders',
      orderItems: 'bar_order_items',
      transactions: 'bar_inventory_transactions',
    },
    orderNumberGenerator: 'generate_bar_order_number',
  },
  kitchen: {
    name: 'kitchen',
    displayName: 'Kitchen',
    module: 'kitchen',
    icon: 'ChefHat',
    color: 'orange',
    tables: {
      inventory: 'kitchen_inventory',
      menu: 'kitchen_menu_items',
      orders: 'kitchen_orders',
      orderItems: 'kitchen_order_items',
      transactions: 'kitchen_inventory_transactions',
    },
    orderNumberGenerator: 'generate_kitchen_order_number',
  },
  restaurant: {
    name: 'restaurant',
    displayName: 'Restaurant',
    module: 'restaurant',
    icon: 'UtensilsCrossed',
    color: 'emerald',
    tables: {
      inventory: 'restaurant_inventory',
      menu: 'restaurant_menu_items',
      orders: 'restaurant_orders',
      orderItems: 'restaurant_order_items',
      transactions: 'restaurant_inventory_transactions',
    },
    orderNumberGenerator: 'generate_restaurant_order_number',
  },
  spa: {
    name: 'spa',
    displayName: 'Spa & Wellness',
    module: 'spa',
    icon: 'Sparkles',
    color: 'pink',
    tables: {
      inventory: 'spa_inventory',
      services: 'spa_services',
      bookings: 'spa_bookings',
      transactions: 'spa_inventory_transactions',
    },
    orderNumberGenerator: 'generate_spa_booking_number',
  },
  housekeeping: {
    name: 'housekeeping',
    displayName: 'Housekeeping',
    module: 'housekeeping',
    icon: 'Sparkle',
    color: 'blue',
    tables: {
      inventory: 'housekeeping_inventory',
      tasks: 'housekeeping_tasks',
      transactions: 'housekeeping_inventory_transactions',
    },
    orderNumberGenerator: 'generate_housekeeping_task_number',
  },
};
