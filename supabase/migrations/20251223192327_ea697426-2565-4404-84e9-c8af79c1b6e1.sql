-- Fix hotel_settings: Create a secure view that hides admin_secret_code from non-admins
-- First, drop existing SELECT policy
DROP POLICY IF EXISTS "Anyone authenticated can view hotel settings" ON public.hotel_settings;

-- Create new policy: Only admins can view full hotel settings (including admin_secret_code)
CREATE POLICY "Admins can view full hotel settings"
  ON public.hotel_settings FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create a secure view for non-admin users that excludes the admin_secret_code
CREATE OR REPLACE VIEW public.hotel_settings_public AS
SELECT 
  id,
  hotel_name,
  tagline,
  logo_url,
  address,
  city,
  state,
  country,
  pincode,
  phone,
  email,
  website,
  currency_symbol,
  date_format,
  time_format,
  invoice_prefix,
  invoice_start_number,
  created_at,
  updated_at
FROM public.hotel_settings;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.hotel_settings_public TO authenticated;

-- Update guests table policy to be more restrictive
-- Drop existing policies
DROP POLICY IF EXISTS "Users with permission can view guests" ON public.guests;
DROP POLICY IF EXISTS "Users with permission can manage guests" ON public.guests;

-- Create new restrictive policies for guests
CREATE POLICY "Staff with guests permission can view guests"
  ON public.guests FOR SELECT
  TO authenticated
  USING (has_permission(auth.uid(), 'guests', 'view') OR is_admin(auth.uid()));

CREATE POLICY "Staff with guests permission can manage guests"
  ON public.guests FOR ALL
  TO authenticated
  USING (has_permission(auth.uid(), 'guests', 'create') OR is_admin(auth.uid()));

-- Update billing table policy
DROP POLICY IF EXISTS "Users with permission can view billing" ON public.billing;
DROP POLICY IF EXISTS "Users with permission can manage billing" ON public.billing;

CREATE POLICY "Staff with billing permission can view billing"
  ON public.billing FOR SELECT
  TO authenticated
  USING (has_permission(auth.uid(), 'billing', 'view') OR is_admin(auth.uid()));

CREATE POLICY "Staff with billing permission can manage billing"
  ON public.billing FOR ALL
  TO authenticated
  USING (has_permission(auth.uid(), 'billing', 'create') OR is_admin(auth.uid()));

-- Update check_ins table policy
DROP POLICY IF EXISTS "Users with permission can view check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Users with permission can manage check-ins" ON public.check_ins;

CREATE POLICY "Staff with check_in permission can view check-ins"
  ON public.check_ins FOR SELECT
  TO authenticated
  USING (has_permission(auth.uid(), 'check_in', 'view') OR is_admin(auth.uid()));

CREATE POLICY "Staff with check_in permission can manage check-ins"
  ON public.check_ins FOR ALL
  TO authenticated
  USING (has_permission(auth.uid(), 'check_in', 'create') OR is_admin(auth.uid()));

-- Update reservations table policy
DROP POLICY IF EXISTS "Users with permission can view reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users with permission can manage reservations" ON public.reservations;

CREATE POLICY "Staff with reservations permission can view reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (has_permission(auth.uid(), 'reservations', 'view') OR is_admin(auth.uid()));

CREATE POLICY "Staff with reservations permission can manage reservations"
  ON public.reservations FOR ALL
  TO authenticated
  USING (has_permission(auth.uid(), 'reservations', 'create') OR is_admin(auth.uid()));