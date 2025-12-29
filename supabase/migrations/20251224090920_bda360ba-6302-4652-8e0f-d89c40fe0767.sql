-- Fix is_admin_dynamic to check BOTH user_roles and user_roles_dynamic tables
CREATE OR REPLACE FUNCTION public.is_admin_dynamic(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    -- Check dynamic roles table
    SELECT 1 FROM public.user_roles_dynamic urd
    JOIN public.roles r ON urd.role_id = r.id
    WHERE urd.user_id = _user_id AND LOWER(r.name) = 'admin'
  )
  OR EXISTS (
    -- Also check legacy user_roles table for backwards compatibility
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'admin'
  )
$$;