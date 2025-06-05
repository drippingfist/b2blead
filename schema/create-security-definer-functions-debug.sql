-- First, let's drop any existing functions to start clean
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.is_superadmin();
DROP FUNCTION IF EXISTS public.is_admin_for_bot(text);
DROP FUNCTION IF EXISTS public.get_user_accessible_bots();

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
BEGIN
    -- Get the highest role for the current user
    -- Order by role priority: superadmin > admin > member
    SELECT role INTO user_role
    FROM bot_users
    WHERE id = auth.uid()
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
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM bot_users 
        WHERE id = auth.uid() 
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
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM bot_users 
        WHERE id = auth.uid() 
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
BEGIN
    -- Check if user is superadmin
    SELECT is_superadmin() INTO is_super;
    
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
            SELECT bot_share_name 
            FROM bot_users 
            WHERE id = auth.uid() 
              AND is_active = true
              AND bot_share_name IS NOT NULL
        ) INTO bot_names;
    END IF;
    
    RETURN COALESCE(bot_names, ARRAY[]::TEXT[]);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_for_bot(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_bots() TO authenticated;

-- Grant execute permissions to service_role (for API routes)
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_for_bot(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_bots() TO service_role;

-- Grant execute permissions to anon role as well
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin_for_bot(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_bots() TO anon;

-- Force PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- Verify functions exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_role') THEN
        RAISE EXCEPTION 'Function get_current_user_role was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
        RAISE EXCEPTION 'Function is_superadmin was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_accessible_bots') THEN
        RAISE EXCEPTION 'Function get_user_accessible_bots was not created';
    END IF;
    
    RAISE NOTICE 'All functions created successfully';
END;
$$;
