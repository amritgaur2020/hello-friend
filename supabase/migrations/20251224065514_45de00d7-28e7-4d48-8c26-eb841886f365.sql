-- Add missing columns and tables for full compatibility

-- Add full_name column to guests if not exists (it uses first_name/last_name)
-- Create a view or function for full_name
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;

-- Add expected_check_out column to check_ins
ALTER TABLE public.check_ins ADD COLUMN expected_check_out DATE;

-- Create hotel_settings table
CREATE TABLE IF NOT EXISTS public.hotel_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_name TEXT DEFAULT 'Hotel',
  currency_symbol TEXT DEFAULT '$',
  currency_code TEXT DEFAULT 'USD',
  tax_percentage NUMERIC(5,2) DEFAULT 0,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default hotel settings
INSERT INTO public.hotel_settings (hotel_name, currency_symbol, currency_code)
VALUES ('Hotel Management System', '$', 'USD')
ON CONFLICT DO NOTHING;

-- Create housekeeping tables
CREATE TABLE IF NOT EXISTS public.housekeeping_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT,
  min_stock_level NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.housekeeping_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id),
  task_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  assigned_to TEXT,
  scheduled_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.housekeeping_inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID REFERENCES public.housekeeping_inventory(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create kitchen tables
CREATE TABLE IF NOT EXISTS public.kitchen_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT,
  min_stock_level NUMERIC(10,2) DEFAULT 0,
  price NUMERIC(10,2) DEFAULT 0,
  cost_price NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kitchen_menu (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kitchen_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT,
  guest_id UUID REFERENCES public.guests(id),
  room_id UUID REFERENCES public.rooms(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kitchen_inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID REFERENCES public.kitchen_inventory(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create restaurant tables
CREATE TABLE IF NOT EXISTS public.restaurant_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT,
  min_stock_level NUMERIC(10,2) DEFAULT 0,
  price NUMERIC(10,2) DEFAULT 0,
  cost_price NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.restaurant_menu (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.restaurant_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT,
  guest_id UUID REFERENCES public.guests(id),
  room_id UUID REFERENCES public.rooms(id),
  table_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.restaurant_inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID REFERENCES public.restaurant_inventory(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create spa tables
CREATE TABLE IF NOT EXISTS public.spa_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT,
  min_stock_level NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spa_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER DEFAULT 60,
  description TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spa_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID REFERENCES public.guests(id),
  service_id UUID REFERENCES public.spa_services(id),
  booking_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spa_inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID REFERENCES public.spa_inventory(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.hotel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spa_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spa_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spa_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spa_inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all new tables
CREATE POLICY "Authenticated users can view hotel_settings" ON public.hotel_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage hotel_settings" ON public.hotel_settings FOR ALL TO authenticated USING (public.is_admin_dynamic(auth.uid())) WITH CHECK (public.is_admin_dynamic(auth.uid()));

CREATE POLICY "Authenticated users can view housekeeping_inventory" ON public.housekeeping_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage housekeeping_inventory" ON public.housekeeping_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view housekeeping_tasks" ON public.housekeeping_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage housekeeping_tasks" ON public.housekeeping_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view housekeeping_inventory_transactions" ON public.housekeeping_inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage housekeeping_inventory_transactions" ON public.housekeeping_inventory_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view kitchen_inventory" ON public.kitchen_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage kitchen_inventory" ON public.kitchen_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view kitchen_menu" ON public.kitchen_menu FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage kitchen_menu" ON public.kitchen_menu FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view kitchen_orders" ON public.kitchen_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage kitchen_orders" ON public.kitchen_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view kitchen_inventory_transactions" ON public.kitchen_inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage kitchen_inventory_transactions" ON public.kitchen_inventory_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view restaurant_inventory" ON public.restaurant_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage restaurant_inventory" ON public.restaurant_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view restaurant_menu" ON public.restaurant_menu FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage restaurant_menu" ON public.restaurant_menu FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view restaurant_orders" ON public.restaurant_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage restaurant_orders" ON public.restaurant_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view restaurant_inventory_transactions" ON public.restaurant_inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage restaurant_inventory_transactions" ON public.restaurant_inventory_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view spa_inventory" ON public.spa_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage spa_inventory" ON public.spa_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view spa_services" ON public.spa_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage spa_services" ON public.spa_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view spa_bookings" ON public.spa_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage spa_bookings" ON public.spa_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view spa_inventory_transactions" ON public.spa_inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage spa_inventory_transactions" ON public.spa_inventory_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create generate_bar_order_number function
CREATE OR REPLACE FUNCTION public.generate_bar_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO order_count FROM public.bar_orders;
  RETURN 'BAR-' || LPAD(order_count::TEXT, 6, '0');
END;
$$;