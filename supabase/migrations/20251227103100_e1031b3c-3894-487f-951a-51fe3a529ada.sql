-- Create a security definer function for role assignment
CREATE OR REPLACE FUNCTION public.assign_user_role(
  target_user_id uuid,
  target_role_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check if the caller is an admin
  IF NOT is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can assign roles');
  END IF;

  -- Delete any existing role for this user
  DELETE FROM user_roles_dynamic WHERE user_id = target_user_id;

  -- Insert new role
  INSERT INTO user_roles_dynamic (user_id, role_id)
  VALUES (target_user_id, target_role_id);

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create a function to remove user roles
CREATE OR REPLACE FUNCTION public.remove_user_role(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can remove roles');
  END IF;

  DELETE FROM user_roles_dynamic WHERE user_id = target_user_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Fix the orphaned karan user by assigning spa_staff role
DO $$
DECLARE
  spa_role_id uuid;
  orphan_user_id uuid := '31d8975a-8773-4b29-a5eb-142c7fc9f09d';
BEGIN
  SELECT id INTO spa_role_id FROM roles WHERE name = 'spa_staff' LIMIT 1;
  
  IF spa_role_id IS NOT NULL THEN
    -- Delete any existing assignment first
    DELETE FROM user_roles_dynamic WHERE user_id = orphan_user_id;
    -- Insert the new role
    INSERT INTO user_roles_dynamic (user_id, role_id)
    VALUES (orphan_user_id, spa_role_id);
  END IF;
END $$;