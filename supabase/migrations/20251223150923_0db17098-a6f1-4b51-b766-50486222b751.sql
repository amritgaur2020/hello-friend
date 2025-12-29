-- Create a security definer function to verify admin secret code
-- This bypasses RLS so it can be called during signup
CREATE OR REPLACE FUNCTION public.verify_admin_secret_code(_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_code TEXT;
BEGIN
  SELECT admin_secret_code INTO stored_code
  FROM public.hotel_settings
  LIMIT 1;
  
  RETURN stored_code = _code;
END;
$$;

-- Allow anonymous users to call this function
GRANT EXECUTE ON FUNCTION public.verify_admin_secret_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_admin_secret_code(TEXT) TO authenticated;