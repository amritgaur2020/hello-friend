-- Create kitchen_menu_items table
CREATE TABLE IF NOT EXISTS public.kitchen_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create kitchen_order_items table
CREATE TABLE IF NOT EXISTS public.kitchen_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.kitchen_orders(id) ON DELETE CASCADE,
  menu_item_id UUID,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create restaurant_menu_items table
CREATE TABLE IF NOT EXISTS public.restaurant_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create restaurant_order_items table
CREATE TABLE IF NOT EXISTS public.restaurant_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  menu_item_id UUID,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to kitchen_inventory and restaurant_inventory
ALTER TABLE public.kitchen_inventory ADD COLUMN IF NOT EXISTS current_stock NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.kitchen_inventory ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE public.kitchen_inventory ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.kitchen_inventory ADD COLUMN IF NOT EXISTS last_restocked TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.restaurant_inventory ADD COLUMN IF NOT EXISTS current_stock NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.restaurant_inventory ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE public.restaurant_inventory ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.restaurant_inventory ADD COLUMN IF NOT EXISTS last_restocked TIMESTAMP WITH TIME ZONE;

-- Create generate_kitchen_order_number function
CREATE OR REPLACE FUNCTION public.generate_kitchen_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO order_count FROM public.kitchen_orders;
  RETURN 'KIT-' || LPAD(order_count::TEXT, 6, '0');
END;
$$;

-- Create generate_restaurant_order_number function
CREATE OR REPLACE FUNCTION public.generate_restaurant_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO order_count FROM public.restaurant_orders;
  RETURN 'RST-' || LPAD(order_count::TEXT, 6, '0');
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.kitchen_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view kitchen_menu_items" ON public.kitchen_menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage kitchen_menu_items" ON public.kitchen_menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view kitchen_order_items" ON public.kitchen_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage kitchen_order_items" ON public.kitchen_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view restaurant_menu_items" ON public.restaurant_menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage restaurant_menu_items" ON public.restaurant_menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view restaurant_order_items" ON public.restaurant_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage restaurant_order_items" ON public.restaurant_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);