-- Add missing columns to bar_orders
ALTER TABLE public.bar_orders 
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'dine_in',
ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_mode text;

-- Add missing columns to bar_order_items
ALTER TABLE public.bar_order_items 
ADD COLUMN IF NOT EXISTS item_name text,
ADD COLUMN IF NOT EXISTS total_price numeric DEFAULT 0;

-- Add missing columns to kitchen_order_items
ALTER TABLE public.kitchen_order_items 
ADD COLUMN IF NOT EXISTS item_name text,
ADD COLUMN IF NOT EXISTS total_price numeric DEFAULT 0;

-- Add missing columns to restaurant_order_items
ALTER TABLE public.restaurant_order_items 
ADD COLUMN IF NOT EXISTS item_name text,
ADD COLUMN IF NOT EXISTS total_price numeric DEFAULT 0;

-- Add missing columns to guests
ALTER TABLE public.guests 
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS pincode text,
ADD COLUMN IF NOT EXISTS total_visits integer DEFAULT 1;

-- Add pincode to hotel_settings (alias for postal_code)
ALTER TABLE public.hotel_settings 
ADD COLUMN IF NOT EXISTS pincode text;

-- Add missing columns to check_ins
ALTER TABLE public.check_ins 
ADD COLUMN IF NOT EXISTS num_guests integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS actual_check_out timestamp with time zone,
ADD COLUMN IF NOT EXISTS checked_out_by uuid;

-- Add missing columns to reservations
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS reservation_number text,
ADD COLUMN IF NOT EXISTS num_adults integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS num_children integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS num_guests integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS special_requests text,
ADD COLUMN IF NOT EXISTS advance_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS room_type_id uuid REFERENCES public.room_types(id);

-- Add payment_status to spa_bookings
ALTER TABLE public.spa_bookings 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';

-- Create billing_items table
CREATE TABLE IF NOT EXISTS public.billing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_id uuid REFERENCES public.billing(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  service_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on billing_items
ALTER TABLE public.billing_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for billing_items
CREATE POLICY "Authenticated users can view billing_items" 
ON public.billing_items FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage billing_items" 
ON public.billing_items FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create tax_settings table
CREATE TABLE IF NOT EXISTS public.tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  percentage numeric NOT NULL DEFAULT 0,
  description text,
  applies_to text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on tax_settings
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for tax_settings
CREATE POLICY "Authenticated users can view tax_settings" 
ON public.tax_settings FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage tax_settings" 
ON public.tax_settings FOR ALL 
USING (is_admin_dynamic(auth.uid())) 
WITH CHECK (is_admin_dynamic(auth.uid()));

-- Create generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO invoice_count FROM public.billing;
  RETURN 'INV-' || LPAD(invoice_count::TEXT, 6, '0');
END;
$$;

-- Create generate_reservation_number function
CREATE OR REPLACE FUNCTION public.generate_reservation_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reservation_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO reservation_count FROM public.reservations;
  RETURN 'RES-' || LPAD(reservation_count::TEXT, 6, '0');
END;
$$;