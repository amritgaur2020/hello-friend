-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user', 'receptionist', 'housekeeping', 'kitchen', 'bar', 'restaurant', 'spa');

-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create roles table
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles_dynamic table
CREATE TABLE public.user_roles_dynamic (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action_type TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT NOT NULL,
  record_id TEXT,
  record_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles_dynamic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin_dynamic(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_dynamic urd
    JOIN public.roles r ON urd.role_id = r.id
    WHERE urd.user_id = _user_id AND LOWER(r.name) = 'admin'
  )
$$;

-- Create function to log activities
CREATE OR REPLACE FUNCTION public.log_activity(
  _action_type TEXT,
  _module TEXT,
  _description TEXT,
  _record_id TEXT DEFAULT NULL,
  _record_type TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action_type, module, description, record_id, record_type)
  VALUES (auth.uid(), _action_type, _module, _description, _record_id, _record_type);
END;
$$;

-- RLS Policies for departments
CREATE POLICY "Anyone can view active departments" ON public.departments FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (public.is_admin_dynamic(auth.uid())) WITH CHECK (public.is_admin_dynamic(auth.uid()));

-- RLS Policies for roles
CREATE POLICY "Anyone can view active roles" ON public.roles FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL TO authenticated USING (public.is_admin_dynamic(auth.uid())) WITH CHECK (public.is_admin_dynamic(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin_dynamic(auth.uid()));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin_dynamic(auth.uid()));
CREATE POLICY "Service role can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for user_roles_dynamic
CREATE POLICY "Anyone can view roles" ON public.user_roles_dynamic FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage dynamic roles" ON public.user_roles_dynamic FOR ALL TO authenticated USING (public.is_admin_dynamic(auth.uid())) WITH CHECK (public.is_admin_dynamic(auth.uid()));

-- RLS Policies for activity_logs
CREATE POLICY "Admins can view all logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_admin_dynamic(auth.uid()));
CREATE POLICY "Anyone can insert logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data ->> 'full_name', ''));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default departments
INSERT INTO public.departments (name, description) VALUES
  ('Administration', 'Hotel administration and management'),
  ('Front Desk', 'Reception and guest services'),
  ('Housekeeping', 'Room cleaning and maintenance'),
  ('Kitchen', 'Food preparation'),
  ('Bar', 'Bar operations'),
  ('Restaurant', 'Restaurant service'),
  ('Spa', 'Spa and wellness services');

-- Insert default roles
INSERT INTO public.roles (name, display_name, department_id) VALUES
  ('admin', 'Administrator', (SELECT id FROM public.departments WHERE name = 'Administration')),
  ('manager', 'Manager', (SELECT id FROM public.departments WHERE name = 'Administration')),
  ('receptionist', 'Receptionist', (SELECT id FROM public.departments WHERE name = 'Front Desk')),
  ('front_desk', 'Front Desk Staff', (SELECT id FROM public.departments WHERE name = 'Front Desk')),
  ('housekeeper', 'Housekeeper', (SELECT id FROM public.departments WHERE name = 'Housekeeping')),
  ('housekeeping_supervisor', 'Housekeeping Supervisor', (SELECT id FROM public.departments WHERE name = 'Housekeeping')),
  ('chef', 'Chef', (SELECT id FROM public.departments WHERE name = 'Kitchen')),
  ('cook', 'Cook', (SELECT id FROM public.departments WHERE name = 'Kitchen')),
  ('bartender', 'Bartender', (SELECT id FROM public.departments WHERE name = 'Bar')),
  ('bar_supervisor', 'Bar Supervisor', (SELECT id FROM public.departments WHERE name = 'Bar')),
  ('waiter', 'Waiter', (SELECT id FROM public.departments WHERE name = 'Restaurant')),
  ('restaurant_supervisor', 'Restaurant Supervisor', (SELECT id FROM public.departments WHERE name = 'Restaurant')),
  ('spa_therapist', 'Spa Therapist', (SELECT id FROM public.departments WHERE name = 'Spa')),
  ('spa_supervisor', 'Spa Supervisor', (SELECT id FROM public.departments WHERE name = 'Spa'));