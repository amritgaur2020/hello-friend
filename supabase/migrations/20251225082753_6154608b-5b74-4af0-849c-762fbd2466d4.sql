-- Disable RLS on user_roles to allow role management without restrictions
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Drop the existing policies since RLS is disabled
DROP POLICY IF EXISTS "Allow first admin creation when none exists" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;