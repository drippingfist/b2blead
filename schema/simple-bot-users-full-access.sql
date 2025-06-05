-- Simple RLS for bot_users - full access for authenticated users
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "bot_users_select_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_insert_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_update_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_delete_policy" ON bot_users;

-- Create simple policies - full access for authenticated users
CREATE POLICY "bot_users_full_access" ON bot_users
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Service role also gets full access
CREATE POLICY "bot_users_service_role_access" ON bot_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON bot_users TO service_role;
GRANT ALL ON bot_users TO authenticated;

-- Verify no recursion by testing a simple query
DO $$
BEGIN
    RAISE NOTICE 'Testing bot_users access...';
    -- This should not cause recursion
    PERFORM COUNT(*) FROM bot_users;
    RAISE NOTICE 'bot_users access test successful - no recursion detected';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'bot_users access test failed: %', SQLERRM;
END
$$;
