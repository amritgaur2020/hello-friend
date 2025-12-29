-- Create bar_menu_items table (alias for bar_menu for compatibility)
CREATE TABLE IF NOT EXISTS public.bar_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to bar_inventory for compatibility
ALTER TABLE public.bar_inventory ADD COLUMN IF NOT EXISTS current_stock NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.bar_inventory ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.bar_inventory ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE public.bar_inventory ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.bar_inventory ADD COLUMN IF NOT EXISTS last_restocked TIMESTAMP WITH TIME ZONE;

-- Enable RLS for bar_menu_items
ALTER TABLE public.bar_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bar_menu_items" ON public.bar_menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage bar_menu_items" ON public.bar_menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);