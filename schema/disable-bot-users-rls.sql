-- Disable RLS entirely on bot_users for simplicity
ALTER TABLE bot_users DISABLE ROW LEVEL SECURITY;

-- Drop all policies since RLS is disabled
DROP POLICY IF EXISTS "bot_users_select_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_insert_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_update_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_delete_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_full_access" ON bot_users;
DROP POLICY IF EXISTS "bot_users_service_role_access" ON bot_users;

-- Grant permissions
GRANT ALL ON bot_users TO service_role;
GRANT ALL ON bot_users TO authenticated;

-- Test that queries work without RLS
DO $$
BEGIN
    RAISE NOTICE 'Testing bot_users access without RLS...';
    PERFORM COUNT(*) FROM bot_users;
    RAISE NOTICE 'bot_users access test successful - RLS disabled';
END
$$;
