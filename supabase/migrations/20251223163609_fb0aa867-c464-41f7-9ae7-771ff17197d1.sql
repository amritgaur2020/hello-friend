-- Phase 1: Add department_id to roles table
ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

-- Phase 2: Create user_roles_dynamic table for dynamic role assignment
CREATE TABLE IF NOT EXISTS public.user_roles_dynamic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Enable RLS on user_roles_dynamic
ALTER TABLE public.user_roles_dynamic ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles_dynamic
CREATE POLICY "Admins can manage dynamic roles"
ON public.user_roles_dynamic
FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view dynamic roles"
ON public.user_roles_dynamic
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own dynamic role during signup"
ON public.user_roles_dynamic
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Phase 3: Update helper functions to work with dynamic roles

-- Function to get user role from dynamic table
CREATE OR REPLACE FUNCTION public.get_user_role_dynamic(_user_id uuid)
RETURNS TABLE(role_name text, display_name text, department_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name, r.display_name, d.name as department_name
  FROM public.user_roles_dynamic urd
  JOIN public.roles r ON urd.role_id = r.id
  LEFT JOIN public.departments d ON r.department_id = d.id
  WHERE urd.user_id = _user_id
  LIMIT 1
$$;

-- Function to check if user has a dynamic role
CREATE OR REPLACE FUNCTION public.has_dynamic_role(_user_id uuid, _role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles_dynamic urd
    JOIN public.roles r ON urd.role_id = r.id
    WHERE urd.user_id = _user_id
      AND r.name = _role_name
  )
$$;

-- Function to check permissions for dynamic roles
CREATE OR REPLACE FUNCTION public.has_dynamic_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles_dynamic urd
    JOIN public.roles r ON urd.role_id = r.id
    JOIN public.permissions p ON p.role::text = r.name
    WHERE urd.user_id = _user_id
      AND p.module = _module
      AND p.action = _action
      AND p.is_allowed = true
  ) OR public.is_admin(_user_id)
$$;

-- Phase 4: Insert common hotel departments
INSERT INTO public.departments (name, description, is_active) VALUES
  ('Security', 'Hotel security and safety operations', true),
  ('Restaurant', 'Food and beverage service', true),
  ('Spa & Wellness', 'Spa, pool, and wellness services', true),
  ('Concierge', 'Guest services and assistance', true),
  ('Kitchen', 'Food preparation and culinary operations', true),
  ('Maintenance', 'Building and equipment maintenance', true),
  ('Parking', 'Valet and parking services', true),
  ('Night Operations', 'Night shift and audit operations', true)
ON CONFLICT DO NOTHING;

-- Phase 5: Insert common hotel roles linked to departments
-- Security Guard
INSERT INTO public.roles (name, display_name, description, is_system, is_active, department_id)
SELECT 'security_guard', 'Security Guard', 'Hotel security personnel responsible for safety and access control', false, true, id
FROM public.departments WHERE name = 'Security'
ON CONFLICT (name) DO UPDATE SET department_id = EXCLUDED.department_id;

-- Restaurant Staff
INSERT INTO public.roles (name, display_name, description, is_system, is_active, department_id)
SELECT 'restaurant_staff', 'Restaurant Staff', 'Food and beverage service personnel', false, true, id
FROM public.departments WHERE name = 'Restaurant'
ON CONFLICT (name) DO UPDATE SET department_id = EXCLUDED.department_id;

-- Kitchen Staff
INSERT INTO public.roles (name, display_name, description, is_system, is_active, department_id)
SELECT 'kitchen_staff', 'Kitchen Staff', 'Food preparation and culinary staff', false, true, id
FROM public.departments WHERE name = 'Kitchen'
ON CONFLICT (name) DO UPDATE SET department_id = EXCLUDED.department_id;

-- Spa Attendant
INSERT INTO public.roles (name, display_name, description, is_system, is_active, department_id)
SELECT 'spa_attendant', 'Spa Attendant', 'Spa and wellness service personnel', false, true, id
FROM public.departments WHERE name = 'Spa & Wellness'
ON CONFLICT (name) DO UPDATE SET department_id = EXCLUDED.department_id;

-- Pool Attendant
INSERT INTO public.roles (name, display_name, description, is_system, is_active, department_id)
SELECT 'pool_attendant', 'Pool Attendant', 'Swimming pool and recreation area staff', false, true, id
FROM public.departments WHERE name = 'Spa & Wellness'
ON CONFLICT (name) DO UPDATE SET department_id = EXCLUDED.department_id;

-- Concierge
INSERT INTO public.roles (name, display_name, description, is_system, is_active, department_id)
SELECT 'concierge', 'Concierge', 'Guest services and travel assistance specialist', false, true, id
FROM public.departments WHERE name = 'Concierge'
ON CONFLICT (name) DO UPDATE SET department_id = EXCLUDED.department_id;

-- Bellboy/Porter
INSERT INTO public.roles (name, display_name, description, is_system, is_active, department_id)
SELECT 'bellboy', 'Bellboy / Porter', 'Luggage handling and guest assistance', false, true, id
FROM public.departments WHERE name = 'Concierge'
ON CONFLICT (name) DO UPDATE SET department_id = EXCLUDED.department_id;

-- Night Auditor
INSERT INTO public.roles (name, display_name, description, is_system, is_active, department_id)
SELECT 'night_auditor', 'Night Auditor', 'Night shift financial reconciliation and front desk', false, true, id
FROM public.departments WHERE name = 'Night Operations'
ON CONFLICT (name) DO UPDATE SET department_id = EXCLUDED.department_id;

-- Maintenance Staff
INSERT INTO public.roles (name, display_name, description, is_system, is_active, department_id)
SELECT 'maintenance_staff', 'Maintenance Staff', 'Building and equipment maintenance personnel', false, true, id
FROM public.departments WHERE name = 'Maintenance'
ON CONFLICT (name) DO UPDATE SET department_id = EXCLUDED.department_id;

-- Valet
INSERT INTO public.roles (name, display_name, description, is_system, is_active, department_id)
SELECT 'valet', 'Valet', 'Parking and vehicle handling service', false, true, id
FROM public.departments WHERE name = 'Parking'
ON CONFLICT (name) DO UPDATE SET department_id = EXCLUDED.department_id;

-- Update existing system roles with appropriate departments
UPDATE public.roles SET department_id = (SELECT id FROM public.departments WHERE name = 'Front Desk' LIMIT 1)
WHERE name = 'front_desk';

-- Add unique constraint on roles.name if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_name_key') THEN
    ALTER TABLE public.roles ADD CONSTRAINT roles_name_key UNIQUE (name);
  END IF;
END $$;