-- Fix the SECURITY DEFINER view issue by making it a SECURITY INVOKER view
DROP VIEW IF EXISTS public.hotel_settings_public;

-- Recreate the view with SECURITY INVOKER (default, explicit for clarity)
CREATE VIEW public.hotel_settings_public 
WITH (security_invoker = true) AS
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