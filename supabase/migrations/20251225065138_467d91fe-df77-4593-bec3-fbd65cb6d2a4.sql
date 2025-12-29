-- Add missing columns to bar_inventory
ALTER TABLE public.bar_inventory 
ADD COLUMN IF NOT EXISTS min_stock_level numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS last_restocked timestamp with time zone;

-- Create bar_menu_items table (the code expects this, not bar_menu)
CREATE TABLE IF NOT EXISTS public.bar_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Modify bar_orders to match expected schema
ALTER TABLE public.bar_orders 
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'dine_in',
ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_mode text;

-- Modify bar_order_items to match expected schema
ALTER TABLE public.bar_order_items 
ADD COLUMN IF NOT EXISTS item_name text,
ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_price numeric DEFAULT 0;

-- Create kitchen_menu_items table
CREATE TABLE IF NOT EXISTS public.kitchen_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  ingredients jsonb,
  is_available boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create kitchen_orders table
CREATE TABLE IF NOT EXISTS public.kitchen_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text,
  order_type text DEFAULT 'dine_in',
  table_number text,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  subtotal numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  payment_status text DEFAULT 'pending',
  payment_mode text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  served_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create kitchen_order_items table
CREATE TABLE IF NOT EXISTS public.kitchen_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.kitchen_orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES public.kitchen_menu_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Add missing columns to kitchen_inventory
ALTER TABLE public.kitchen_inventory 
ADD COLUMN IF NOT EXISTS min_stock_level numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS selling_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS last_restocked timestamp with time zone;

-- Create restaurant_menu_items table
CREATE TABLE IF NOT EXISTS public.restaurant_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  ingredients jsonb,
  is_available boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create restaurant_orders table
CREATE TABLE IF NOT EXISTS public.restaurant_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text,
  order_type text DEFAULT 'dine_in',
  table_number text,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  subtotal numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  payment_status text DEFAULT 'pending',
  payment_mode text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  served_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create restaurant_order_items table
CREATE TABLE IF NOT EXISTS public.restaurant_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.restaurant_orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES public.restaurant_menu_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Add missing columns to restaurant_inventory
ALTER TABLE public.restaurant_inventory 
ADD COLUMN IF NOT EXISTS min_stock_level numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS selling_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS last_restocked timestamp with time zone;

-- Create spa_services table
CREATE TABLE IF NOT EXISTS public.spa_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  price numeric NOT NULL DEFAULT 0,
  duration_minutes integer DEFAULT 60,
  image_url text,
  is_available boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create spa_bookings table
CREATE TABLE IF NOT EXISTS public.spa_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.spa_services(id) ON DELETE SET NULL,
  therapist_name text,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time,
  status text DEFAULT 'pending',
  subtotal numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  payment_status text DEFAULT 'pending',
  payment_mode text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add missing columns to spa_inventory
ALTER TABLE public.spa_inventory 
ADD COLUMN IF NOT EXISTS min_stock_level numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS selling_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS last_restocked timestamp with time zone;

-- Create housekeeping_tasks table
CREATE TABLE IF NOT EXISTS public.housekeeping_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number text,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  task_type text NOT NULL,
  priority text DEFAULT 'normal',
  status text DEFAULT 'pending',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_name text,
  scheduled_date date,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add missing columns to housekeeping_inventory
ALTER TABLE public.housekeeping_inventory 
ADD COLUMN IF NOT EXISTS min_stock_level numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS selling_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS last_restocked timestamp with time zone;

-- Add previous_stock and new_stock columns to all transaction tables
ALTER TABLE public.bar_inventory_transactions 
ADD COLUMN IF NOT EXISTS previous_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reference_id text;

ALTER TABLE public.kitchen_inventory_transactions 
ADD COLUMN IF NOT EXISTS previous_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reference_id text;

ALTER TABLE public.restaurant_inventory_transactions 
ADD COLUMN IF NOT EXISTS previous_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reference_id text;

ALTER TABLE public.spa_inventory_transactions 
ADD COLUMN IF NOT EXISTS previous_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reference_id text;

ALTER TABLE public.housekeeping_inventory_transactions 
ADD COLUMN IF NOT EXISTS previous_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reference_id text;

-- Enable RLS on new tables
ALTER TABLE public.bar_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spa_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spa_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for new tables
CREATE POLICY "Authenticated can view bar_menu_items" ON public.bar_menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage bar_menu_items" ON public.bar_menu_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view kitchen_menu_items" ON public.kitchen_menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage kitchen_menu_items" ON public.kitchen_menu_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view kitchen_orders" ON public.kitchen_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage kitchen_orders" ON public.kitchen_orders FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view kitchen_order_items" ON public.kitchen_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage kitchen_order_items" ON public.kitchen_order_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view restaurant_menu_items" ON public.restaurant_menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage restaurant_menu_items" ON public.restaurant_menu_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view restaurant_orders" ON public.restaurant_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage restaurant_orders" ON public.restaurant_orders FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view restaurant_order_items" ON public.restaurant_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage restaurant_order_items" ON public.restaurant_order_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view spa_services" ON public.spa_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage spa_services" ON public.spa_services FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view spa_bookings" ON public.spa_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage spa_bookings" ON public.spa_bookings FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view housekeeping_tasks" ON public.housekeeping_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage housekeeping_tasks" ON public.housekeeping_tasks FOR ALL TO authenticated USING (true);

-- Create order number generator functions
CREATE OR REPLACE FUNCTION public.generate_bar_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS integer)), 0) + 1 
  INTO next_num 
  FROM bar_orders 
  WHERE order_number LIKE 'BAR%';
  RETURN 'BAR' || LPAD(next_num::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_kitchen_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS integer)), 0) + 1 
  INTO next_num 
  FROM kitchen_orders 
  WHERE order_number LIKE 'KIT%';
  RETURN 'KIT' || LPAD(next_num::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_restaurant_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS integer)), 0) + 1 
  INTO next_num 
  FROM restaurant_orders 
  WHERE order_number LIKE 'RES%';
  RETURN 'RES' || LPAD(next_num::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_spa_booking_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM 4) AS integer)), 0) + 1 
  INTO next_num 
  FROM spa_bookings 
  WHERE booking_number LIKE 'SPA%';
  RETURN 'SPA' || LPAD(next_num::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_housekeeping_task_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(task_number FROM 3) AS integer)), 0) + 1 
  INTO next_num 
  FROM housekeeping_tasks 
  WHERE task_number LIKE 'HK%';
  RETURN 'HK' || LPAD(next_num::text, 6, '0');
END;
$$;

-- Update triggers for new tables
CREATE TRIGGER update_bar_menu_items_updated_at BEFORE UPDATE ON public.bar_menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kitchen_menu_items_updated_at BEFORE UPDATE ON public.kitchen_menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kitchen_orders_updated_at BEFORE UPDATE ON public.kitchen_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_restaurant_menu_items_updated_at BEFORE UPDATE ON public.restaurant_menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_restaurant_orders_updated_at BEFORE UPDATE ON public.restaurant_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_spa_services_updated_at BEFORE UPDATE ON public.spa_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_spa_bookings_updated_at BEFORE UPDATE ON public.spa_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_housekeeping_tasks_updated_at BEFORE UPDATE ON public.housekeeping_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();