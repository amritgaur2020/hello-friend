-- Create remaining tables needed by the existing code

-- Room types table
CREATE TABLE IF NOT EXISTS public.room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  base_price numeric NOT NULL DEFAULT 0,
  max_occupancy integer NOT NULL DEFAULT 2,
  amenities jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number text NOT NULL UNIQUE,
  room_type_id uuid REFERENCES public.room_types(id) ON DELETE SET NULL,
  floor integer,
  status text NOT NULL DEFAULT 'available',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Guests table
CREATE TABLE IF NOT EXISTS public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  full_name text,
  email text,
  phone text,
  id_type text,
  id_number text,
  address text,
  city text,
  state text,
  pincode text,
  date_of_birth date,
  nationality text,
  notes text,
  total_visits integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number text UNIQUE,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  room_type_id uuid REFERENCES public.room_types(id) ON DELETE SET NULL,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  num_adults integer DEFAULT 1,
  num_children integer DEFAULT 0,
  num_guests integer DEFAULT 1,
  special_requests text,
  advance_amount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  total_amount numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  check_in_time timestamp with time zone DEFAULT now(),
  check_out_time timestamp with time zone,
  expected_check_out timestamp with time zone,
  actual_check_out timestamp with time zone,
  num_guests integer DEFAULT 1,
  checked_out_by uuid,
  status text DEFAULT 'active',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Services table
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Billing table
CREATE TABLE IF NOT EXISTS public.billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE,
  check_in_id uuid REFERENCES public.check_ins(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  payment_method text,
  payment_date timestamp with time zone,
  due_date timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Billing items table
CREATE TABLE IF NOT EXISTS public.billing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_id uuid REFERENCES public.billing(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity integer DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Tax settings table
CREATE TABLE IF NOT EXISTS public.tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  percentage numeric NOT NULL DEFAULT 0,
  description text,
  applies_to text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Bar inventory table
CREATE TABLE IF NOT EXISTS public.bar_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  unit text DEFAULT 'pcs',
  current_stock numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  max_stock numeric DEFAULT 100,
  cost_price numeric DEFAULT 0,
  selling_price numeric DEFAULT 0,
  supplier text,
  description text,
  is_active boolean DEFAULT true,
  last_restock_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Bar inventory transactions
CREATE TABLE IF NOT EXISTS public.bar_inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.bar_inventory(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL,
  quantity numeric NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Bar menu table
CREATE TABLE IF NOT EXISTS public.bar_menu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean DEFAULT true,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Bar orders table
CREATE TABLE IF NOT EXISTS public.bar_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text,
  table_number text,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  total_amount numeric DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Bar order items table
CREATE TABLE IF NOT EXISTS public.bar_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.bar_orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES public.bar_menu(id) ON DELETE SET NULL,
  quantity integer DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Kitchen inventory
CREATE TABLE IF NOT EXISTS public.kitchen_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  unit text DEFAULT 'kg',
  current_stock numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  max_stock numeric DEFAULT 100,
  cost_price numeric DEFAULT 0,
  supplier text,
  description text,
  is_active boolean DEFAULT true,
  last_restock_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Kitchen inventory transactions
CREATE TABLE IF NOT EXISTS public.kitchen_inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.kitchen_inventory(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL,
  quantity numeric NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Restaurant inventory
CREATE TABLE IF NOT EXISTS public.restaurant_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  unit text DEFAULT 'pcs',
  current_stock numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  max_stock numeric DEFAULT 100,
  cost_price numeric DEFAULT 0,
  supplier text,
  description text,
  is_active boolean DEFAULT true,
  last_restock_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Restaurant inventory transactions
CREATE TABLE IF NOT EXISTS public.restaurant_inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.restaurant_inventory(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL,
  quantity numeric NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Spa inventory
CREATE TABLE IF NOT EXISTS public.spa_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  unit text DEFAULT 'pcs',
  current_stock numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  max_stock numeric DEFAULT 100,
  cost_price numeric DEFAULT 0,
  supplier text,
  description text,
  is_active boolean DEFAULT true,
  last_restock_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Spa inventory transactions
CREATE TABLE IF NOT EXISTS public.spa_inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.spa_inventory(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL,
  quantity numeric NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Housekeeping inventory
CREATE TABLE IF NOT EXISTS public.housekeeping_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  unit text DEFAULT 'pcs',
  current_stock numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  max_stock numeric DEFAULT 100,
  cost_price numeric DEFAULT 0,
  supplier text,
  description text,
  is_active boolean DEFAULT true,
  last_restock_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Housekeeping inventory transactions
CREATE TABLE IF NOT EXISTS public.housekeeping_inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES public.housekeeping_inventory(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL,
  quantity numeric NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spa_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spa_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for all new tables - allow authenticated users to view and admins to manage
CREATE POLICY "Authenticated can view room_types" ON public.room_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage room_types" ON public.room_types FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can view rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage rooms" ON public.rooms FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Staff can update rooms" ON public.rooms FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can view guests" ON public.guests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert guests" ON public.guests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update guests" ON public.guests FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can view reservations" ON public.reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert reservations" ON public.reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update reservations" ON public.reservations FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can view check_ins" ON public.check_ins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert check_ins" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update check_ins" ON public.check_ins FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can view services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage services" ON public.services FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can view billing" ON public.billing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert billing" ON public.billing FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update billing" ON public.billing FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can view billing_items" ON public.billing_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert billing_items" ON public.billing_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can view tax_settings" ON public.tax_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tax_settings" ON public.tax_settings FOR ALL USING (public.is_admin(auth.uid()));

-- Bar policies
CREATE POLICY "Authenticated can view bar_inventory" ON public.bar_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bar staff can manage bar_inventory" ON public.bar_inventory FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view bar_inventory_transactions" ON public.bar_inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bar staff can insert bar_inventory_transactions" ON public.bar_inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can view bar_menu" ON public.bar_menu FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bar staff can manage bar_menu" ON public.bar_menu FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view bar_orders" ON public.bar_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bar staff can manage bar_orders" ON public.bar_orders FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view bar_order_items" ON public.bar_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bar staff can manage bar_order_items" ON public.bar_order_items FOR ALL TO authenticated USING (true);

-- Kitchen policies
CREATE POLICY "Authenticated can view kitchen_inventory" ON public.kitchen_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Kitchen staff can manage kitchen_inventory" ON public.kitchen_inventory FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view kitchen_inventory_transactions" ON public.kitchen_inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Kitchen staff can insert kitchen_inventory_transactions" ON public.kitchen_inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- Restaurant policies
CREATE POLICY "Authenticated can view restaurant_inventory" ON public.restaurant_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Restaurant staff can manage restaurant_inventory" ON public.restaurant_inventory FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view restaurant_inventory_transactions" ON public.restaurant_inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Restaurant staff can insert restaurant_inventory_transactions" ON public.restaurant_inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- Spa policies
CREATE POLICY "Authenticated can view spa_inventory" ON public.spa_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Spa staff can manage spa_inventory" ON public.spa_inventory FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view spa_inventory_transactions" ON public.spa_inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Spa staff can insert spa_inventory_transactions" ON public.spa_inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- Housekeeping policies
CREATE POLICY "Authenticated can view housekeeping_inventory" ON public.housekeeping_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Housekeeping staff can manage housekeeping_inventory" ON public.housekeeping_inventory FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view housekeeping_inventory_transactions" ON public.housekeeping_inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Housekeeping staff can insert housekeeping_inventory_transactions" ON public.housekeeping_inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- Update triggers for new tables
CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON public.room_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_check_ins_updated_at BEFORE UPDATE ON public.check_ins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_billing_updated_at BEFORE UPDATE ON public.billing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tax_settings_updated_at BEFORE UPDATE ON public.tax_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bar_inventory_updated_at BEFORE UPDATE ON public.bar_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bar_menu_updated_at BEFORE UPDATE ON public.bar_menu FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bar_orders_updated_at BEFORE UPDATE ON public.bar_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kitchen_inventory_updated_at BEFORE UPDATE ON public.kitchen_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_restaurant_inventory_updated_at BEFORE UPDATE ON public.restaurant_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_spa_inventory_updated_at BEFORE UPDATE ON public.spa_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_housekeeping_inventory_updated_at BEFORE UPDATE ON public.housekeeping_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();