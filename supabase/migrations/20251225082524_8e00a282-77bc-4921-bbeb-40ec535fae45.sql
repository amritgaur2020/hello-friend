-- Allow first admin creation when no admin exists (bootstrap case)
-- This uses security definer function to safely check if admin exists
CREATE POLICY "Allow first admin creation when none exists" 
ON public.user_roles 
FOR INSERT 
TO authenticated 
WITH CHECK (
  role = 'admin' 
  AND auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  )
);