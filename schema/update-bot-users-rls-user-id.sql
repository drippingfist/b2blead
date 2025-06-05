-- Update bot_users RLS policies to use user_id instead of id
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "bot_users_select_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_insert_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_update_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_delete_policy" ON bot_users;

-- SELECT Policy: Users can see their own records
CREATE POLICY "bot_users_select_policy" ON bot_users
    FOR SELECT
    USING (
        -- Service role can see everything (for API routes)
        auth.role() = 'service_role'
        OR
        -- Users can see their own records
        user_id = auth.uid()
    );

-- INSERT Policy: Only service role can create new assignments
CREATE POLICY "bot_users_insert_policy" ON bot_users
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- UPDATE Policy: Users can update their own records (but not critical fields)
CREATE POLICY "bot_users_update_policy" ON bot_users
    FOR UPDATE
    USING (
        -- Service role can update anything
        auth.role() = 'service_role'
        OR
        -- Users can update their own records
        user_id = auth.uid()
    )
    WITH CHECK (
        -- Service role can update anything
        auth.role() = 'service_role'
        OR
        -- Regular users can only update non-critical fields of their own records
        (user_id = auth.uid() AND role = OLD.role AND bot_share_name = OLD.bot_share_name)
    );

-- DELETE Policy: Only service role can delete assignments
CREATE POLICY "bot_users_delete_policy" ON bot_users
    FOR DELETE
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON bot_users TO service_role;
GRANT SELECT, UPDATE ON bot_users TO authenticated;
