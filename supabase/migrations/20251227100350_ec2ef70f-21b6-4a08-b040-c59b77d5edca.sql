-- Fix all department staff roles to have their primary module permissions set to is_allowed = true
-- This ensures when permissions are granted in the admin, the staff can access their modules

-- First, ensure bar_staff has bar module access
UPDATE public.permissions 
SET is_allowed = true 
WHERE role = 'bar_staff' AND module = 'bar';

-- Insert missing bar_staff permissions for bar module if they don't exist
INSERT INTO public.permissions (role, module, action, is_allowed)
SELECT 'bar_staff', 'bar', action, true
FROM unnest(ARRAY['view', 'create', 'edit', 'delete']) AS action
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions 
  WHERE role = 'bar_staff' AND module = 'bar' AND permissions.action = action
);

-- Also grant dashboard view access to bar_staff
INSERT INTO public.permissions (role, module, action, is_allowed)
VALUES ('bar_staff', 'dashboard', 'view', true)
ON CONFLICT DO NOTHING;

UPDATE public.permissions 
SET is_allowed = true 
WHERE role = 'bar_staff' AND module = 'dashboard' AND action = 'view';

-- Fix kitchen_staff permissions
UPDATE public.permissions 
SET is_allowed = true 
WHERE role = 'kitchen_staff' AND module = 'kitchen';

INSERT INTO public.permissions (role, module, action, is_allowed)
SELECT 'kitchen_staff', 'kitchen', action, true
FROM unnest(ARRAY['view', 'create', 'edit', 'delete']) AS action
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions 
  WHERE role = 'kitchen_staff' AND module = 'kitchen' AND permissions.action = action
);

INSERT INTO public.permissions (role, module, action, is_allowed)
VALUES ('kitchen_staff', 'dashboard', 'view', true)
ON CONFLICT DO NOTHING;

UPDATE public.permissions 
SET is_allowed = true 
WHERE role = 'kitchen_staff' AND module = 'dashboard' AND action = 'view';

-- Fix restaurant_staff permissions
UPDATE public.permissions 
SET is_allowed = true 
WHERE role = 'restaurant_staff' AND module = 'restaurant';

INSERT INTO public.permissions (role, module, action, is_allowed)
SELECT 'restaurant_staff', 'restaurant', action, true
FROM unnest(ARRAY['view', 'create', 'edit', 'delete']) AS action
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions 
  WHERE role = 'restaurant_staff' AND module = 'restaurant' AND permissions.action = action
);

INSERT INTO public.permissions (role, module, action, is_allowed)
VALUES ('restaurant_staff', 'dashboard', 'view', true)
ON CONFLICT DO NOTHING;

UPDATE public.permissions 
SET is_allowed = true 
WHERE role = 'restaurant_staff' AND module = 'dashboard' AND action = 'view';

-- Fix spa_staff permissions
UPDATE public.permissions 
SET is_allowed = true 
WHERE role = 'spa_staff' AND module = 'spa';

INSERT INTO public.permissions (role, module, action, is_allowed)
SELECT 'spa_staff', 'spa', action, true
FROM unnest(ARRAY['view', 'create', 'edit', 'delete']) AS action
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions 
  WHERE role = 'spa_staff' AND module = 'spa' AND permissions.action = action
);

INSERT INTO public.permissions (role, module, action, is_allowed)
VALUES ('spa_staff', 'dashboard', 'view', true)
ON CONFLICT DO NOTHING;

UPDATE public.permissions 
SET is_allowed = true 
WHERE role = 'spa_staff' AND module = 'dashboard' AND action = 'view';

-- Fix housekeeping_staff permissions
UPDATE public.permissions 
SET is_allowed = true 
WHERE role = 'housekeeping_staff' AND module = 'housekeeping';

INSERT INTO public.permissions (role, module, action, is_allowed)
SELECT 'housekeeping_staff', 'housekeeping', action, true
FROM unnest(ARRAY['view', 'create', 'edit', 'delete']) AS action
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions 
  WHERE role = 'housekeeping_staff' AND module = 'housekeeping' AND permissions.action = action
);

INSERT INTO public.permissions (role, module, action, is_allowed)
VALUES ('housekeeping_staff', 'dashboard', 'view', true)
ON CONFLICT DO NOTHING;

UPDATE public.permissions 
SET is_allowed = true 
WHERE role = 'housekeeping_staff' AND module = 'dashboard' AND action = 'view';

-- Fix receptionist permissions (front desk access)
UPDATE public.permissions 
SET is_allowed = true 
WHERE role = 'receptionist' AND module IN ('reservations', 'check_in', 'rooms', 'guests', 'billing', 'dashboard');

INSERT INTO public.permissions (role, module, action, is_allowed)
SELECT 'receptionist', module, action, true
FROM unnest(ARRAY['reservations', 'check_in', 'rooms', 'guests', 'billing', 'dashboard']) AS module,
     unnest(ARRAY['view', 'create', 'edit', 'delete']) AS action
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions 
  WHERE role = 'receptionist' AND permissions.module = module AND permissions.action = action
);

-- Fix manager permissions (all modules)
UPDATE public.permissions 
SET is_allowed = true 
WHERE role = 'manager';

-- Also fix any non-admin users requiring password change
UPDATE public.profiles 
SET requires_password_change = false 
WHERE id NOT IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
  UNION
  SELECT urd.user_id FROM public.user_roles_dynamic urd 
  JOIN public.roles r ON urd.role_id = r.id 
  WHERE r.name = 'admin'
);