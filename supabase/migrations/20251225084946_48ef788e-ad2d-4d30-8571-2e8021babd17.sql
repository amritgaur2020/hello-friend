-- Fix RLS policies on user_roles_dynamic table
-- The issue is that the ALL policy only has USING clause but no WITH CHECK clause
-- For INSERT operations, WITH CHECK is required

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage dynamic roles" ON public.user_roles_dynamic;
DROP POLICY IF EXISTS "Users can view own dynamic role" ON public.user_roles_dynamic;

-- Create proper policies with both USING and WITH CHECK clauses

-- Admins can SELECT all dynamic roles
CREATE POLICY "Admins can view all dynamic roles" 
ON public.user_roles_dynamic 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Admins can INSERT dynamic roles for any user
CREATE POLICY "Admins can insert dynamic roles" 
ON public.user_roles_dynamic 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- Admins can UPDATE dynamic roles
CREATE POLICY "Admins can update dynamic roles" 
ON public.user_roles_dynamic 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- Admins can DELETE dynamic roles
CREATE POLICY "Admins can delete dynamic roles" 
ON public.user_roles_dynamic 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Users can view their own role
CREATE POLICY "Users can view own dynamic role" 
ON public.user_roles_dynamic 
FOR SELECT 
USING (auth.uid() = user_id);