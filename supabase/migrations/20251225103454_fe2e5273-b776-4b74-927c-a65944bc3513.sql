-- Fix bar_order_items FK to match app usage (bar_menu_items)
ALTER TABLE public.bar_order_items
  DROP CONSTRAINT IF EXISTS bar_order_items_menu_item_id_fkey;

ALTER TABLE public.bar_order_items
  ADD CONSTRAINT bar_order_items_menu_item_id_fkey
  FOREIGN KEY (menu_item_id)
  REFERENCES public.bar_menu_items(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- Ensure every billing record gets an invoice number automatically
CREATE OR REPLACE FUNCTION public.set_billing_invoice_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := public.generate_invoice_number();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_billing_invoice_number ON public.billing;
CREATE TRIGGER set_billing_invoice_number
BEFORE INSERT ON public.billing
FOR EACH ROW
EXECUTE FUNCTION public.set_billing_invoice_number();

-- Backfill existing billing rows missing invoice_number
UPDATE public.billing
SET invoice_number = public.generate_invoice_number()
WHERE invoice_number IS NULL OR invoice_number = '';
