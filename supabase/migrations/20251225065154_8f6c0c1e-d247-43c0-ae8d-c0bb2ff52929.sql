-- Add missing RPC functions
CREATE OR REPLACE FUNCTION public.generate_reservation_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reservation_number FROM 4) AS integer)), 0) + 1 
  INTO next_num 
  FROM reservations 
  WHERE reservation_number LIKE 'RES%';
  RETURN 'RES' || LPAD(next_num::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS integer)), 0) + 1 
  INTO next_num 
  FROM billing 
  WHERE invoice_number LIKE 'INV%';
  RETURN 'INV' || LPAD(next_num::text, 6, '0');
END;
$$;