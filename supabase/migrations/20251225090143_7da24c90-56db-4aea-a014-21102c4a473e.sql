-- Create a security definer function to check if any admin exists
-- This function can be called by anyone (including unauthenticated users)
-- but uses SECURITY DEFINER to bypass RLS

CREATE OR REPLACE FUNCTION public.check_admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
    UNION
    SELECT 1 FROM public.user_roles_dynamic urd 
    JOIN public.roles r ON urd.role_id = r.id 
    WHERE r.name = 'admin'
  )
$$;