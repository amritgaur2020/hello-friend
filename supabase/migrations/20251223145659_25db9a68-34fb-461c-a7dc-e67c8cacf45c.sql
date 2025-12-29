-- Fix functions with mutable search path
CREATE OR REPLACE FUNCTION public.generate_reservation_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT := 'RES-';
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reservation_number FROM 5) AS INTEGER)), 1000) + 1
  INTO next_num
  FROM public.reservations;
  RETURN prefix || next_num::TEXT;
END;
$$;