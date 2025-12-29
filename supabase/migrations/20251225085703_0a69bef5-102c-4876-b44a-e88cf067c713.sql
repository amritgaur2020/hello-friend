-- Enable RLS on user_roles table (legacy table)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;

-- Create policy for admins
CREATE POLICY "Admins can manage user_roles" 
ON public.user_roles 
FOR ALL 
USING (is_admin(auth.uid()));