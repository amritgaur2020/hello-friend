-- =============================================
-- KITCHEN DEPARTMENT TABLES
-- =============================================

-- Kitchen Inventory Table
CREATE TABLE public.kitchen_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock_level NUMERIC NOT NULL DEFAULT 5,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  supplier TEXT,
  sku TEXT,
  last_restocked TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Kitchen Menu Items Table
CREATE TABLE public.kitchen_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  ingredients JSONB,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Kitchen Orders Table
CREATE TABLE public.kitchen_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'dine_in',
  table_number TEXT,
  guest_id UUID REFERENCES public.guests(id),
  room_id UUID REFERENCES public.rooms(id),
  status TEXT NOT NULL DEFAULT 'new',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_mode TEXT,
  notes TEXT,
  created_by UUID,
  served_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Kitchen Order Items Table
CREATE TABLE public.kitchen_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.kitchen_orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.kitchen_menu_items(id),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Kitchen Inventory Transactions Table
CREATE TABLE public.kitchen_inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.kitchen_inventory(id),
  transaction_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  previous_stock NUMERIC NOT NULL DEFAULT 0,
  new_stock NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  reference_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- RESTAURANT DEPARTMENT TABLES
-- =============================================

CREATE TABLE public.restaurant_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock_level NUMERIC NOT NULL DEFAULT 5,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  supplier TEXT,
  sku TEXT,
  last_restocked TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.restaurant_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  ingredients JSONB,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.restaurant_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'dine_in',
  table_number TEXT,
  guest_id UUID REFERENCES public.guests(id),
  room_id UUID REFERENCES public.rooms(id),
  status TEXT NOT NULL DEFAULT 'new',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_mode TEXT,
  notes TEXT,
  created_by UUID,
  served_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.restaurant_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.restaurant_menu_items(id),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.restaurant_inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.restaurant_inventory(id),
  transaction_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  previous_stock NUMERIC NOT NULL DEFAULT 0,
  new_stock NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  reference_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- SPA DEPARTMENT TABLES
-- =============================================

CREATE TABLE public.spa_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock_level NUMERIC NOT NULL DEFAULT 5,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  supplier TEXT,
  sku TEXT,
  last_restocked TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.spa_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.spa_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_number TEXT NOT NULL,
  guest_id UUID REFERENCES public.guests(id),
  room_id UUID REFERENCES public.rooms(id),
  service_id UUID REFERENCES public.spa_services(id),
  therapist_name TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'scheduled',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_mode TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.spa_inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.spa_inventory(id),
  transaction_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  previous_stock NUMERIC NOT NULL DEFAULT 0,
  new_stock NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  reference_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- HOUSEKEEPING DEPARTMENT TABLES
-- =============================================

CREATE TABLE public.housekeeping_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock_level NUMERIC NOT NULL DEFAULT 10,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  supplier TEXT,
  sku TEXT,
  last_restocked TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.housekeeping_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_number TEXT NOT NULL,
  room_id UUID REFERENCES public.rooms(id),
  task_type TEXT NOT NULL DEFAULT 'cleaning',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID,
  assigned_name TEXT,
  scheduled_date DATE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.housekeeping_inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.housekeeping_inventory(id),
  transaction_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  previous_stock NUMERIC NOT NULL DEFAULT 0,
  new_stock NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  reference_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- ORDER NUMBER GENERATORS
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_kitchen_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT := 'KIT-';
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 1000) + 1
  INTO next_num
  FROM public.kitchen_orders;
  RETURN prefix || next_num::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_restaurant_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT := 'REST-';
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 6) AS INTEGER)), 1000) + 1
  INTO next_num
  FROM public.restaurant_orders;
  RETURN prefix || next_num::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_spa_booking_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT := 'SPA-';
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM 5) AS INTEGER)), 1000) + 1
  INTO next_num
  FROM public.spa_bookings;
  RETURN prefix || next_num::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_housekeeping_task_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT := 'HK-';
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(task_number FROM 4) AS INTEGER)), 1000) + 1
  INTO next_num
  FROM public.housekeeping_tasks;
  RETURN prefix || next_num::TEXT;
END;
$$;

-- =============================================
-- ENABLE RLS ON ALL NEW TABLES
-- =============================================

ALTER TABLE public.kitchen_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spa_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spa_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spa_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spa_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_inventory_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR KITCHEN
-- =============================================

CREATE POLICY "Users with kitchen permission can view inventory" ON public.kitchen_inventory FOR SELECT USING (has_permission(auth.uid(), 'kitchen', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with kitchen permission can manage inventory" ON public.kitchen_inventory FOR ALL USING (has_permission(auth.uid(), 'kitchen', 'create') OR is_admin(auth.uid()));

CREATE POLICY "Users with kitchen permission can view menu" ON public.kitchen_menu_items FOR SELECT USING (has_permission(auth.uid(), 'kitchen', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with kitchen permission can manage menu" ON public.kitchen_menu_items FOR ALL USING (has_permission(auth.uid(), 'kitchen', 'create') OR is_admin(auth.uid()));

CREATE POLICY "Users with kitchen permission can view orders" ON public.kitchen_orders FOR SELECT USING (has_permission(auth.uid(), 'kitchen', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with kitchen permission can manage orders" ON public.kitchen_orders FOR ALL USING (has_permission(auth.uid(), 'kitchen', 'create') OR is_admin(auth.uid()));

CREATE POLICY "Users with kitchen permission can view order items" ON public.kitchen_order_items FOR SELECT USING (has_permission(auth.uid(), 'kitchen', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with kitchen permission can manage order items" ON public.kitchen_order_items FOR ALL USING (has_permission(auth.uid(), 'kitchen', 'create') OR is_admin(auth.uid()));

CREATE POLICY "Users with kitchen permission can view transactions" ON public.kitchen_inventory_transactions FOR SELECT USING (has_permission(auth.uid(), 'kitchen', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with kitchen permission can manage transactions" ON public.kitchen_inventory_transactions FOR ALL USING (has_permission(auth.uid(), 'kitchen', 'create') OR is_admin(auth.uid()));

-- =============================================
-- RLS POLICIES FOR RESTAURANT
-- =============================================

CREATE POLICY "Users with restaurant permission can view inventory" ON public.restaurant_inventory FOR SELECT USING (has_permission(auth.uid(), 'restaurant', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with restaurant permission can manage inventory" ON public.restaurant_inventory FOR ALL USING (has_permission(auth.uid(), 'restaurant', 'create') OR is_admin(auth.uid()));

CREATE POLICY "Users with restaurant permission can view menu" ON public.restaurant_menu_items FOR SELECT USING (has_permission(auth.uid(), 'restaurant', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with restaurant permission can manage menu" ON public.restaurant_menu_items FOR ALL USING (has_permission(auth.uid(), 'restaurant', 'create') OR is_admin(auth.uid()));

CREATE POLICY "Users with restaurant permission can view orders" ON public.restaurant_orders FOR SELECT USING (has_permission(auth.uid(), 'restaurant', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with restaurant permission can manage orders" ON public.restaurant_orders FOR ALL USING (has_permission(auth.uid(), 'restaurant', 'create') OR is_admin(auth.uid()));

CREATE POLICY "Users with restaurant permission can view order items" ON public.restaurant_order_items FOR SELECT USING (has_permission(auth.uid(), 'restaurant', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with restaurant permission can manage order items" ON public.restaurant_order_items FOR ALL USING (has_permission(auth.uid(), 'restaurant', 'create') OR is_admin(auth.uid()));

CREATE POLICY "Users with restaurant permission can view transactions" ON public.restaurant_inventory_transactions FOR SELECT USING (has_permission(auth.uid(), 'restaurant', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with restaurant permission can manage transactions" ON public.restaurant_inventory_transactions FOR ALL USING (has_permission(auth.uid(), 'restaurant', 'create') OR is_admin(auth.uid()));

-- =============================================
-- RLS POLICIES FOR SPA
-- =============================================

CREATE POLICY "Users with spa permission can view inventory" ON public.spa_inventory FOR SELECT USING (has_permission(auth.uid(), 'spa', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with spa permission can manage inventory" ON public.spa_inventory FOR ALL USING (has_permission(auth.uid(), 'spa', 'create') OR is_admin(auth.uid()));

CREATE POLICY "Users with spa permission can view services" ON public.spa_services FOR SELECT USING (has_permission(auth.uid(), 'spa', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with spa permission can manage services" ON public.spa_services FOR ALL USING (has_permission(auth.uid(), 'spa', 'create') OR is_admin(auth.uid()));

CREATE POLICY "Users with spa permission can view bookings" ON public.spa_bookings FOR SELECT USING (has_permission(auth.uid(), 'spa', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with spa permission can manage bookings" ON public.spa_bookings FOR ALL USING (has_permission(auth.uid(), 'spa', 'create') OR is_admin(auth.uid()));

CREATE POLICY "Users with spa permission can view transactions" ON public.spa_inventory_transactions FOR SELECT USING (has_permission(auth.uid(), 'spa', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with spa permission can manage transactions" ON public.spa_inventory_transactions FOR ALL USING (has_permission(auth.uid(), 'spa', 'create') OR is_admin(auth.uid()));

-- =============================================
-- RLS POLICIES FOR HOUSEKEEPING
-- =============================================

CREATE POLICY "Users with housekeeping permission can view inventory" ON public.housekeeping_inventory FOR SELECT USING (has_permission(auth.uid(), 'housekeeping', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with housekeeping permission can manage inventory" ON public.housekeeping_inventory FOR ALL USING (has_permission(auth.uid(), 'housekeeping', 'create') OR is_admin(auth.uid()));

CREATE POLICY "Users with housekeeping permission can view tasks" ON public.housekeeping_tasks FOR SELECT USING (has_permission(auth.uid(), 'housekeeping', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with housekeeping permission can manage tasks" ON public.housekeeping_tasks FOR ALL USING (has_permission(auth.uid(), 'housekeeping', 'create') OR is_admin(auth.uid()));

CREATE POLICY "Users with housekeeping permission can view transactions" ON public.housekeeping_inventory_transactions FOR SELECT USING (has_permission(auth.uid(), 'housekeeping', 'view') OR is_admin(auth.uid()));
CREATE POLICY "Users with housekeeping permission can manage transactions" ON public.housekeeping_inventory_transactions FOR ALL USING (has_permission(auth.uid(), 'housekeeping', 'create') OR is_admin(auth.uid()));