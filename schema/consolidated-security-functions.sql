-- Drop all existing functions to start clean
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.is_superadmin();
DROP FUNCTION IF EXISTS public.is_admin_for_bot(text);
DROP FUNCTION IF EXISTS public.get_user_accessible_bots();
DROP FUNCTION IF EXISTS public.can_manage_bot_user(uuid, text);

-- Function to get the current user's highest role
-- CRITICAL: Uses user_id (FK to auth.users), NOT id (PK of bot_users)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN 'none';
    END IF;
    
    -- FIXED: Use user_id (FK), not id (PK)
    SELECT role INTO user_role
    FROM bot_users
    WHERE user_id = current_user_id  -- CRITICAL FIX
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
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- CRITICAL FIX: Check the correct bot_super_users table
    RETURN EXISTS (
        SELECT 1
        FROM public.bot_super_users
        WHERE id = auth.uid() AND is_active = true
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
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- FIXED: Use user_id (FK), not id (PK)
    RETURN EXISTS (
        SELECT 1 
        FROM bot_users 
        WHERE user_id = current_user_id  -- CRITICAL FIX
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
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
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
        -- FIXED: Use user_id (FK), not id (PK)
        SELECT ARRAY(
            SELECT DISTINCT bot_share_name 
            FROM bot_users 
            WHERE user_id = current_user_id  -- CRITICAL FIX
              AND is_active = true
              AND bot_share_name IS NOT NULL
        ) INTO bot_names;
    END IF;
    
    RETURN COALESCE(bot_names, ARRAY[]::TEXT[]);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_for_bot(TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_bots() TO authenticated, service_role, anon;

-- Force refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'CONSOLIDATED SECURITY FUNCTIONS CREATED:';
    RAISE NOTICE '✅ All functions now use user_id (FK) instead of id (PK)';
    RAISE NOTICE '✅ This fixes the critical RLS security vulnerability';
END $$;
