-- Create bar_inventory table
CREATE TABLE public.bar_inventory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- spirits, beer, wine, mixer, garnish, other
    unit TEXT NOT NULL DEFAULT 'bottle', -- bottle, can, ml, piece, kg
    current_stock NUMERIC NOT NULL DEFAULT 0,
    min_stock_level NUMERIC NOT NULL DEFAULT 5,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    selling_price NUMERIC NOT NULL DEFAULT 0,
    supplier TEXT,
    sku TEXT,
    last_restocked TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bar_menu_items table
CREATE TABLE public.bar_menu_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- cocktails, mocktails, whisky, beer, wine, vodka, rum, brandy, shots, soft_drinks
    price NUMERIC NOT NULL DEFAULT 0,
    ingredients JSONB, -- array of {inventory_id, quantity}
    is_available BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bar_orders table
CREATE TABLE public.bar_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    table_number TEXT,
    guest_id UUID REFERENCES public.guests(id),
    room_id UUID REFERENCES public.rooms(id),
    status TEXT NOT NULL DEFAULT 'new', -- new, preparing, served, billed, cancelled
    order_type TEXT NOT NULL DEFAULT 'dine_in', -- dine_in, room_service, takeaway
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, partial
    payment_mode TEXT, -- cash, card, upi, room_charge
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    served_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bar_order_items table
CREATE TABLE public.bar_order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.bar_orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.bar_menu_items(id),
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bar_inventory_transactions table
CREATE TABLE public.bar_inventory_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_id UUID NOT NULL REFERENCES public.bar_inventory(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- purchase, sale, waste, adjustment, opening
    quantity NUMERIC NOT NULL,
    previous_stock NUMERIC NOT NULL DEFAULT 0,
    new_stock NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    reference_id UUID, -- order_id for sales
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.bar_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bar_inventory
CREATE POLICY "Users with bar permission can view inventory"
ON public.bar_inventory FOR SELECT
USING (has_permission(auth.uid(), 'bar', 'view') OR is_admin(auth.uid()));

CREATE POLICY "Users with bar permission can manage inventory"
ON public.bar_inventory FOR ALL
USING (has_permission(auth.uid(), 'bar', 'create') OR is_admin(auth.uid()));

-- RLS Policies for bar_menu_items
CREATE POLICY "Users with bar permission can view menu"
ON public.bar_menu_items FOR SELECT
USING (has_permission(auth.uid(), 'bar', 'view') OR is_admin(auth.uid()));

CREATE POLICY "Users with bar permission can manage menu"
ON public.bar_menu_items FOR ALL
USING (has_permission(auth.uid(), 'bar', 'create') OR is_admin(auth.uid()));

-- RLS Policies for bar_orders
CREATE POLICY "Users with bar permission can view orders"
ON public.bar_orders FOR SELECT
USING (has_permission(auth.uid(), 'bar', 'view') OR is_admin(auth.uid()));

CREATE POLICY "Users with bar permission can manage orders"
ON public.bar_orders FOR ALL
USING (has_permission(auth.uid(), 'bar', 'create') OR is_admin(auth.uid()));

-- RLS Policies for bar_order_items
CREATE POLICY "Users with bar permission can view order items"
ON public.bar_order_items FOR SELECT
USING (has_permission(auth.uid(), 'bar', 'view') OR is_admin(auth.uid()));

CREATE POLICY "Users with bar permission can manage order items"
ON public.bar_order_items FOR ALL
USING (has_permission(auth.uid(), 'bar', 'create') OR is_admin(auth.uid()));

-- RLS Policies for bar_inventory_transactions
CREATE POLICY "Users with bar permission can view transactions"
ON public.bar_inventory_transactions FOR SELECT
USING (has_permission(auth.uid(), 'bar', 'view') OR is_admin(auth.uid()));

CREATE POLICY "Users with bar permission can manage transactions"
ON public.bar_inventory_transactions FOR ALL
USING (has_permission(auth.uid(), 'bar', 'create') OR is_admin(auth.uid()));

-- Create function to generate bar order number
CREATE OR REPLACE FUNCTION public.generate_bar_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT := 'BAR-';
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 1000) + 1
  INTO next_num
  FROM public.bar_orders;
  RETURN prefix || next_num::TEXT;
END;
$$;

-- Create updated_at trigger for bar tables
CREATE TRIGGER update_bar_inventory_updated_at
BEFORE UPDATE ON public.bar_inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bar_menu_items_updated_at
BEFORE UPDATE ON public.bar_menu_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bar_orders_updated_at
BEFORE UPDATE ON public.bar_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for bar_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.bar_orders;