-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.is_superadmin();
DROP FUNCTION IF EXISTS public.is_admin_for_bot(text);
DROP FUNCTION IF EXISTS public.get_user_accessible_bots();
DROP FUNCTION IF EXISTS public.can_manage_bot_user(uuid, text);

-- Function to get the current user's highest role
-- SECURITY DEFINER means it runs with the privileges of the function owner (bypassing RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
    current_user_id TEXT;
BEGIN
    -- Get current user ID as text (since bot_users.id is text)
    current_user_id := auth.uid()::text;
    
    IF current_user_id IS NULL THEN
        RETURN 'none';
    END IF;
    
    -- Get the highest role for the current user from bot_users table
    -- Order by role priority: superadmin > admin > member
    SELECT role INTO user_role
    FROM bot_users
    WHERE id = current_user_id
      AND is_active = true
    ORDER BY 
        CASE role
            WHEN 'superadmin' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'member' THEN 3
            ELSE 4
        END
    LIMIT 1;
    
    RETURN COALESCE(user_role, 'none');
END;
$$;

-- Function to check if current user is a superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id TEXT;
BEGIN
    current_user_id := auth.uid()::text;
    
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 
        FROM bot_users 
        WHERE id = current_user_id
          AND role = 'superadmin' 
          AND is_active = true
    );
END;
$$;

-- Function to check if current user is admin for a specific bot
CREATE OR REPLACE FUNCTION public.is_admin_for_bot(bot_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id TEXT;
BEGIN
    current_user_id := auth.uid()::text;
    
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 
        FROM bot_users 
        WHERE id = current_user_id
          AND bot_share_name = bot_name
          AND role IN ('superadmin', 'admin')
          AND is_active = true
    );
END;
$$;

-- Function to get all accessible bot names for current user
CREATE OR REPLACE FUNCTION public.get_user_accessible_bots()
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    bot_names TEXT[];
    is_super BOOLEAN;
    current_user_id TEXT;
BEGIN
    current_user_id := auth.uid()::text;
    
    IF current_user_id IS NULL THEN
        RETURN ARRAY[]::TEXT[];
    END IF;
    
    -- Check if user is superadmin
    SELECT public.is_superadmin() INTO is_super;
    
    IF is_super THEN
        -- Superadmin gets all bots
        SELECT ARRAY(
            SELECT bot_share_name 
            FROM bots 
            WHERE bot_share_name IS NOT NULL
        ) INTO bot_names;
    ELSE
        -- Regular users get their assigned bots
        SELECT ARRAY(
            SELECT DISTINCT bot_share_name 
            FROM bot_users 
            WHERE id = current_user_id
              AND is_active = true
              AND bot_share_name IS NOT NULL
        ) INTO bot_names;
    END IF;
    
    RETURN COALESCE(bot_names, ARRAY[]::TEXT[]);
END;
$$;

-- Function to check if current user can manage a specific bot_user record
-- This handles the admin permission logic
CREATE OR REPLACE FUNCTION public.can_manage_bot_user(target_user_id UUID, target_bot_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id TEXT;
    current_user_role TEXT;
    is_super BOOLEAN;
BEGIN
    current_user_id := auth.uid()::text;
    
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get current user's role
    SELECT public.get_current_user_role() INTO current_user_role;
    SELECT public.is_superadmin() INTO is_super;
    
    -- Superadmins can manage anyone
    IF is_super THEN
        RETURN TRUE;
    END IF;
    
    -- Users can manage their own records
    IF current_user_id = target_user_id::text THEN
        RETURN TRUE;
    END IF;
    
    -- Admins can manage users in the same bot
    IF current_user_role = 'admin' THEN
        RETURN EXISTS (
            SELECT 1 
            FROM bot_users 
            WHERE id = current_user_id
              AND bot_share_name = target_bot_name
              AND role = 'admin'
              AND is_active = true
        );
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_for_bot(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_bots() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_bot_user(UUID, TEXT) TO authenticated;

-- Grant execute permissions to service_role (for API routes)
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_for_bot(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_bots() TO service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_bot_user(UUID, TEXT) TO service_role;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
