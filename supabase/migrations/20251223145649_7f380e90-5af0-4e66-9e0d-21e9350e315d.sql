-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'front_desk', 'housekeeping');

-- Create status enums
CREATE TYPE public.room_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning', 'maintenance');
CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.payment_status AS ENUM ('pending', 'partial', 'paid', 'refunded');
CREATE TYPE public.payment_mode AS ENUM ('cash', 'card', 'upi', 'online_wallet', 'bank_transfer');

-- Hotel Settings table (editable by admin)
CREATE TABLE public.hotel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_name TEXT NOT NULL DEFAULT 'My Hotel',
  tagline TEXT DEFAULT 'Welcome to our hotel',
  logo_url TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  currency_symbol TEXT DEFAULT '₹',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '12h',
  invoice_prefix TEXT DEFAULT 'INV-',
  invoice_start_number INTEGER DEFAULT 1001,
  admin_secret_code TEXT NOT NULL DEFAULT 'ADMIN2024',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default hotel settings
INSERT INTO public.hotel_settings (hotel_name) VALUES ('Grand Hotel');

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tax settings table
CREATE TABLE public.tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  description TEXT,
  applies_to TEXT[], -- Array of department IDs or 'all'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default GST
INSERT INTO public.tax_settings (name, percentage, description) VALUES ('GST', 18.00, 'Goods and Services Tax');

-- Room types table
CREATE TABLE public.room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_occupancy INTEGER DEFAULT 2,
  amenities TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default room types
INSERT INTO public.room_types (name, base_price, max_occupancy, description) VALUES 
  ('Single Room', 1500, 1, 'Cozy single room with all amenities'),
  ('Double Room', 2500, 2, 'Spacious double room with queen bed'),
  ('Suite', 5000, 4, 'Luxury suite with living area'),
  ('Dormitory Bed', 500, 1, 'Budget-friendly dormitory bed'),
  ('Camping Tent', 800, 2, 'Outdoor camping experience');

-- Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL UNIQUE,
  room_type_id UUID REFERENCES public.room_types(id),
  floor TEXT,
  status room_status DEFAULT 'available',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Guests table
CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  id_type TEXT,
  id_number TEXT,
  id_proof_url TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  date_of_birth DATE,
  nationality TEXT DEFAULT 'Indian',
  notes TEXT,
  total_visits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reservations table
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number TEXT NOT NULL UNIQUE,
  guest_id UUID REFERENCES public.guests(id),
  room_id UUID REFERENCES public.rooms(id),
  room_type_id UUID REFERENCES public.room_types(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  num_guests INTEGER DEFAULT 1,
  num_adults INTEGER DEFAULT 1,
  num_children INTEGER DEFAULT 0,
  special_requests TEXT,
  status reservation_status DEFAULT 'pending',
  source TEXT DEFAULT 'walk_in',
  total_amount DECIMAL(10,2),
  advance_amount DECIMAL(10,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Check-ins table
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.reservations(id),
  guest_id UUID NOT NULL REFERENCES public.guests(id),
  room_id UUID NOT NULL REFERENCES public.rooms(id),
  check_in_time TIMESTAMPTZ DEFAULT now(),
  expected_check_out TIMESTAMPTZ NOT NULL,
  actual_check_out TIMESTAMPTZ,
  num_guests INTEGER DEFAULT 1,
  key_card_number TEXT,
  notes TEXT,
  checked_in_by UUID REFERENCES auth.users(id),
  checked_out_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Services table (for billing)
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Billing table
CREATE TABLE public.billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  check_in_id UUID REFERENCES public.check_ins(id),
  guest_id UUID NOT NULL REFERENCES public.guests(id),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  payment_status payment_status DEFAULT 'pending',
  payment_mode payment_mode,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Billing items table
CREATE TABLE public.billing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_id UUID NOT NULL REFERENCES public.billing(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  service_id UUID REFERENCES public.services(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Permissions table (for granular access control)
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  is_allowed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, module, action)
);

-- Insert default permissions for all roles
INSERT INTO public.permissions (role, module, action, is_allowed) VALUES
  -- Manager permissions
  ('manager', 'dashboard', 'view', true),
  ('manager', 'reservations', 'view', true),
  ('manager', 'reservations', 'create', true),
  ('manager', 'reservations', 'edit', true),
  ('manager', 'check_in', 'view', true),
  ('manager', 'rooms', 'view', true),
  ('manager', 'billing', 'view', true),
  ('manager', 'guests', 'view', true),
  ('manager', 'reports', 'view', true),
  -- Front desk permissions
  ('front_desk', 'dashboard', 'view', true),
  ('front_desk', 'reservations', 'view', true),
  ('front_desk', 'reservations', 'create', true),
  ('front_desk', 'check_in', 'view', true),
  ('front_desk', 'check_in', 'create', true),
  ('front_desk', 'rooms', 'view', true),
  ('front_desk', 'billing', 'view', true),
  ('front_desk', 'billing', 'create', true),
  ('front_desk', 'guests', 'view', true),
  ('front_desk', 'guests', 'create', true),
  -- Housekeeping permissions
  ('housekeeping', 'dashboard', 'view', true),
  ('housekeeping', 'rooms', 'view', true),
  ('housekeeping', 'rooms', 'update_status', true);

-- Activity logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_role app_role,
  action_type TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id UUID,
  record_type TEXT,
  old_data JSONB,
  new_data JSONB,
  description TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.hotel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _module TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.permissions p ON ur.role = p.role
    WHERE ur.user_id = _user_id
      AND p.module = _module
      AND p.action = _action
      AND p.is_allowed = true
  ) OR public.is_admin(_user_id)
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies

-- Hotel settings: Admin can do everything, others can only view
CREATE POLICY "Anyone authenticated can view hotel settings"
  ON public.hotel_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update hotel settings"
  ON public.hotel_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- User roles policies
CREATE POLICY "Authenticated users can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own role during signup"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Departments policies
CREATE POLICY "Authenticated can view departments"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Tax settings policies
CREATE POLICY "Authenticated can view tax settings"
  ON public.tax_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tax settings"
  ON public.tax_settings FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Room types policies
CREATE POLICY "Authenticated can view room types"
  ON public.room_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage room types"
  ON public.room_types FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Rooms policies
CREATE POLICY "Authenticated can view rooms"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users with permission can manage rooms"
  ON public.rooms FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'rooms', 'edit') OR public.is_admin(auth.uid()));

-- Guests policies
CREATE POLICY "Users with permission can view guests"
  ON public.guests FOR SELECT
  TO authenticated
  USING (public.has_permission(auth.uid(), 'guests', 'view') OR public.is_admin(auth.uid()));

CREATE POLICY "Users with permission can manage guests"
  ON public.guests FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'guests', 'create') OR public.is_admin(auth.uid()));

-- Reservations policies
CREATE POLICY "Users with permission can view reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (public.has_permission(auth.uid(), 'reservations', 'view') OR public.is_admin(auth.uid()));

CREATE POLICY "Users with permission can manage reservations"
  ON public.reservations FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'reservations', 'create') OR public.is_admin(auth.uid()));

-- Check-ins policies
CREATE POLICY "Users with permission can view check-ins"
  ON public.check_ins FOR SELECT
  TO authenticated
  USING (public.has_permission(auth.uid(), 'check_in', 'view') OR public.is_admin(auth.uid()));

CREATE POLICY "Users with permission can manage check-ins"
  ON public.check_ins FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'check_in', 'create') OR public.is_admin(auth.uid()));

-- Services policies
CREATE POLICY "Authenticated can view services"
  ON public.services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Billing policies
CREATE POLICY "Users with permission can view billing"
  ON public.billing FOR SELECT
  TO authenticated
  USING (public.has_permission(auth.uid(), 'billing', 'view') OR public.is_admin(auth.uid()));

CREATE POLICY "Users with permission can manage billing"
  ON public.billing FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'billing', 'create') OR public.is_admin(auth.uid()));

-- Billing items policies
CREATE POLICY "Users with billing permission can view items"
  ON public.billing_items FOR SELECT
  TO authenticated
  USING (public.has_permission(auth.uid(), 'billing', 'view') OR public.is_admin(auth.uid()));

CREATE POLICY "Users with billing permission can manage items"
  ON public.billing_items FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'billing', 'create') OR public.is_admin(auth.uid()));

-- Permissions policies
CREATE POLICY "Authenticated can view permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage permissions"
  ON public.permissions FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Activity logs policies
CREATE POLICY "Admins can view all logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can insert logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  _action_type TEXT,
  _module TEXT,
  _description TEXT,
  _record_id UUID DEFAULT NULL,
  _record_type TEXT DEFAULT NULL,
  _old_data JSONB DEFAULT NULL,
  _new_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
  _user_email TEXT;
  _user_role app_role;
BEGIN
  SELECT email INTO _user_email FROM auth.users WHERE id = auth.uid();
  SELECT role INTO _user_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
  
  INSERT INTO public.activity_logs (
    user_id, user_email, user_role, action_type, module, 
    record_id, record_type, old_data, new_data, description
  )
  VALUES (
    auth.uid(), _user_email, _user_role, _action_type, _module,
    _record_id, _record_type, _old_data, _new_data, _description
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Function to generate reservation number
CREATE OR REPLACE FUNCTION public.generate_reservation_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT := 'RES-';
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reservation_number FROM 5) AS INTEGER)), 1000) + 1
  INTO next_num
  FROM public.reservations;
  RETURN prefix || next_num::TEXT;
END;
$$;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  start_num INTEGER;
  next_num INTEGER;
BEGIN
  SELECT invoice_prefix, invoice_start_number INTO prefix, start_num
  FROM public.hotel_settings LIMIT 1;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(prefix) + 1) AS INTEGER)), start_num - 1) + 1
  INTO next_num
  FROM public.billing;
  
  RETURN prefix || next_num::TEXT;
END;
$$;