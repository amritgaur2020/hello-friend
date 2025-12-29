-- Policy to allow first admin creation when no admin exists (bootstrap case)
CREATE POLICY "Allow first admin creation when none exists" 
ON public.user_roles 
FOR INSERT 
TO authenticated 
WITH CHECK (
  role = 'admin' 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  )
  AND auth.uid() = user_id
);