-- Create function to update timestamps if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create roles table for dynamic role management
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated can view roles" 
ON public.roles 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage roles" 
ON public.roles 
FOR ALL 
USING (is_admin(auth.uid()));

-- Insert default system roles (these cannot be deleted)
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
  ('admin', 'Admin', 'Full system access and management', true),
  ('manager', 'Manager', 'Manages daily operations and staff', true),
  ('front_desk', 'Front Desk', 'Handles check-ins, reservations, and guest services', true),
  ('housekeeping', 'Housekeeping', 'Manages room cleaning and maintenance tasks', true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();