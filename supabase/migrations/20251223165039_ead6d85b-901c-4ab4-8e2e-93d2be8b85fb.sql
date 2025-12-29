-- Change role column from ENUM to TEXT to support dynamic roles
ALTER TABLE public.permissions 
  ALTER COLUMN role TYPE TEXT 
  USING role::TEXT;

-- Update has_permission function to work with both legacy and dynamic roles
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check legacy user_roles table
    SELECT 1 FROM public.permissions p
    JOIN public.user_roles ur ON ur.role::text = p.role
    WHERE ur.user_id = _user_id
      AND p.module = _module
      AND p.action = _action
      AND p.is_allowed = true
  )
  OR EXISTS (
    -- Check dynamic user_roles_dynamic table
    SELECT 1 FROM public.permissions p
    JOIN public.user_roles_dynamic urd ON urd.user_id = _user_id
    JOIN public.roles r ON r.id = urd.role_id AND r.name = p.role
    WHERE p.module = _module
      AND p.action = _action
      AND p.is_allowed = true
  )
  OR public.is_admin(_user_id)
$$;

-- Update has_dynamic_permission to also work correctly
CREATE OR REPLACE FUNCTION public.has_dynamic_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles_dynamic urd
    JOIN public.roles r ON urd.role_id = r.id
    JOIN public.permissions p ON p.role = r.name
    WHERE urd.user_id = _user_id
      AND p.module = _module
      AND p.action = _action
      AND p.is_allowed = true
  ) OR public.is_admin(_user_id)
$$;