-- Disable RLS temporarily to clean up
ALTER TABLE bot_users DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "bot_users_select_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_insert_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_update_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_delete_policy" ON bot_users;

-- Re-enable RLS
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;

-- Simple SELECT Policy: Service role can see everything, users can see their own records
CREATE POLICY "bot_users_select_policy" ON bot_users
    FOR SELECT
    USING (
        -- Service role can see everything (for API routes)
        auth.role() = 'service_role'
        OR
        -- Users can see their own records
        id = auth.uid()
    );

-- Simple INSERT Policy: Only service role can insert
CREATE POLICY "bot_users_insert_policy" ON bot_users
    FOR INSERT
    WITH CHECK (
        -- Service role can insert (for API routes)
        auth.role() = 'service_role'
    );

-- Simple UPDATE Policy: Service role can update anything, users can update their own records
CREATE POLICY "bot_users_update_policy" ON bot_users
    FOR UPDATE
    USING (
        -- Service role can update (for API routes)
        auth.role() = 'service_role'
        OR
        -- Users can update their own records
        id = auth.uid()
    )
    WITH CHECK (
        -- Service role can update anything
        auth.role() = 'service_role'
        OR
        -- Regular users can only update non-critical fields of their own records
        (id = auth.uid() AND role = OLD.role AND bot_share_name = OLD.bot_share_name)
    );

-- Simple DELETE Policy: Only service role can delete
CREATE POLICY "bot_users_delete_policy" ON bot_users
    FOR DELETE
    USING (
        -- Service role can delete (for API routes)
        auth.role() = 'service_role'
    );

-- Grant necessary permissions
GRANT ALL ON bot_users TO service_role;
GRANT SELECT, UPDATE ON bot_users TO authenticated;

-- Verify RLS is enabled
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_enabled FROM pg_class WHERE relname = 'bot_users';
    IF rls_enabled THEN
        RAISE NOTICE 'RLS is enabled for bot_users table';
    ELSE
        RAISE EXCEPTION 'RLS is NOT enabled for bot_users table';
    END IF;
END;
$$;
