-- Test script to verify the SECURITY DEFINER functions work
-- Run this after creating the functions to verify they exist and work

-- Test 1: Check if functions exist
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_current_user_role',
    'is_superadmin', 
    'is_admin_for_bot',
    'get_user_accessible_bots',
    'can_manage_bot_user'
  )
ORDER BY routine_name;

-- Test 2: Try calling the functions (these should work even without authentication)
-- Note: These will return default values when not authenticated
SELECT 
    'get_current_user_role' as function_name,
    public.get_current_user_role() as result;

SELECT 
    'is_superadmin' as function_name,
    public.is_superadmin() as result;

SELECT 
    'get_user_accessible_bots' as function_name,
    public.get_user_accessible_bots() as result;

-- Test 3: Check function permissions
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_current_user_role',
    'is_superadmin', 
    'is_admin_for_bot',
    'get_user_accessible_bots',
    'can_manage_bot_user'
  )
ORDER BY routine_name, grantee;
