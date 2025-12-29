-- Add missing columns to spa_bookings
ALTER TABLE public.spa_bookings ADD COLUMN IF NOT EXISTS booking_number TEXT;

-- Add missing columns to housekeeping_tasks
ALTER TABLE public.housekeeping_tasks ADD COLUMN IF NOT EXISTS task_number TEXT;

-- Add missing columns to housekeeping_inventory and spa_inventory
ALTER TABLE public.housekeeping_inventory ADD COLUMN IF NOT EXISTS current_stock NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.housekeeping_inventory ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.housekeeping_inventory ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE public.housekeeping_inventory ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.housekeeping_inventory ADD COLUMN IF NOT EXISTS last_restocked TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.spa_inventory ADD COLUMN IF NOT EXISTS current_stock NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.spa_inventory ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.spa_inventory ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE public.spa_inventory ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.spa_inventory ADD COLUMN IF NOT EXISTS last_restocked TIMESTAMP WITH TIME ZONE;

-- Add missing columns to hotel_settings
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS date_format TEXT;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS check_in_time TIME;
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS check_out_time TIME;

-- Add missing columns to billing
ALTER TABLE public.billing ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.billing ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.billing ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.billing ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.billing ADD COLUMN IF NOT EXISTS due_date DATE;

-- Create generate_spa_booking_number function
CREATE OR REPLACE FUNCTION public.generate_spa_booking_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO booking_count FROM public.spa_bookings;
  RETURN 'SPA-' || LPAD(booking_count::TEXT, 6, '0');
END;
$$;

-- Create generate_housekeeping_task_number function
CREATE OR REPLACE FUNCTION public.generate_housekeeping_task_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO task_count FROM public.housekeeping_tasks;
  RETURN 'HK-' || LPAD(task_count::TEXT, 6, '0');
END;
$$;