-- Complete database schema for Hotel Management System with new authentication

-- 1. Create app_role enum type
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user', 'receptionist', 'housekeeping', 'kitchen', 'bar', 'restaurant', 'spa');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  is_active boolean DEFAULT true,
  requires_password_change boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create user_roles table (legacy)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 4. Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. Create roles table (dynamic roles)
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 6. Create user_roles_dynamic table
CREATE TABLE IF NOT EXISTS public.user_roles_dynamic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- 7. Create admin_config table
CREATE TABLE IF NOT EXISTS public.admin_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_default_password boolean DEFAULT true,
  password_changed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 8. Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module text NOT NULL,
  action text NOT NULL,
  is_allowed boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(role, module, action)
);

-- 9. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  module text NOT NULL,
  description text NOT NULL,
  record_id text,
  record_type text,
  created_at timestamp with time zone DEFAULT now()
);

-- 10. Create hotel_settings table
CREATE TABLE IF NOT EXISTS public.hotel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_name text,
  tagline text,
  logo_url text,
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  pincode text,
  phone text,
  email text,
  website text,
  currency_symbol text DEFAULT '₹',
  currency_code text DEFAULT 'INR',
  date_format text DEFAULT 'dd/MM/yyyy',
  timezone text DEFAULT 'Asia/Kolkata',
  check_in_time text DEFAULT '12:00',
  check_out_time text DEFAULT '11:00',
  tax_percentage numeric DEFAULT 18,
  gst_number text,
  pan_number text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles_dynamic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_settings ENABLE ROW LEVEL SECURITY;

-- Create security definer functions FIRST (before RLS policies use them)

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role::text = _role_name
    UNION
    SELECT 1 FROM user_roles_dynamic urd 
    JOIN roles r ON urd.role_id = r.id 
    WHERE urd.user_id = _user_id AND r.name = _role_name
  )
$$;

-- is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT r.name FROM user_roles_dynamic urd 
     JOIN roles r ON urd.role_id = r.id 
     WHERE urd.user_id = _user_id LIMIT 1),
    (SELECT role::text FROM user_roles WHERE user_id = _user_id LIMIT 1)
  )
$$;

-- log_activity function
CREATE OR REPLACE FUNCTION public.log_activity(
  _action_type text,
  _module text,
  _description text,
  _record_id text DEFAULT NULL,
  _record_type text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action_type, module, description, record_id, record_type)
  VALUES (auth.uid(), _action_type, _module, _description, _record_id, _record_type);
END;
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for departments
CREATE POLICY "Anyone can view active departments" ON public.departments FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for roles
CREATE POLICY "Anyone can view active roles" ON public.roles FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for user_roles_dynamic
CREATE POLICY "Users can view own dynamic role" ON public.user_roles_dynamic FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage dynamic roles" ON public.user_roles_dynamic FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for admin_config
CREATE POLICY "Admins can view own config" ON public.admin_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can update own config" ON public.admin_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert own config" ON public.admin_config FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for permissions
CREATE POLICY "Anyone can view permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage permissions" ON public.permissions FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for activity_logs
CREATE POLICY "Users can view logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for hotel_settings
CREATE POLICY "Anyone can view settings" ON public.hotel_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.hotel_settings FOR ALL USING (public.is_admin(auth.uid()));

-- Trigger for auto-creating profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, requires_password_change)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    true
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_admin_config_updated_at BEFORE UPDATE ON public.admin_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hotel_settings_updated_at BEFORE UPDATE ON public.hotel_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default departments
INSERT INTO public.departments (name, description) VALUES
  ('Front Desk', 'Reception and guest services'),
  ('Bar', 'Bar services and drinks'),
  ('Restaurant', 'Restaurant and dining services'),
  ('Kitchen', 'Food preparation and cooking'),
  ('Spa', 'Spa and wellness services'),
  ('Housekeeping', 'Room cleaning and maintenance')
ON CONFLICT (name) DO NOTHING;

-- Insert default roles including admin
INSERT INTO public.roles (name, display_name, description, department_id) VALUES
  ('admin', 'Administrator', 'Full system access', NULL),
  ('manager', 'Manager', 'Management access', NULL),
  ('receptionist', 'Receptionist', 'Front desk operations', (SELECT id FROM departments WHERE name = 'Front Desk')),
  ('bar_staff', 'Bar Staff', 'Bar operations', (SELECT id FROM departments WHERE name = 'Bar')),
  ('restaurant_staff', 'Restaurant Staff', 'Restaurant operations', (SELECT id FROM departments WHERE name = 'Restaurant')),
  ('kitchen_staff', 'Kitchen Staff', 'Kitchen operations', (SELECT id FROM departments WHERE name = 'Kitchen')),
  ('spa_staff', 'Spa Staff', 'Spa operations', (SELECT id FROM departments WHERE name = 'Spa')),
  ('housekeeping_staff', 'Housekeeping Staff', 'Housekeeping operations', (SELECT id FROM departments WHERE name = 'Housekeeping'))
ON CONFLICT (name) DO NOTHING;

-- Insert default hotel settings
INSERT INTO public.hotel_settings (hotel_name, tagline) VALUES
  ('My Hotel', 'Welcome to our hotel')
ON CONFLICT DO NOTHING;