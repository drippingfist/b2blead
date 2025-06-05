-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;

-- SELECT Policy: Superadmins see all, regular users see messages for threads they can access
CREATE POLICY "messages_select_policy" ON messages
    FOR SELECT
    USING (
        -- Service role can see everything
        auth.role() = 'service_role'
        OR
        -- Superadmins can see all messages
        is_user_superadmin(auth.uid())
        OR
        -- Regular users can see messages for threads they have access to
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM threads t 
                WHERE t.thread_id = messages.thread_id 
                AND t.bot_share_name = ANY(get_user_accessible_bots(auth.uid()))
            )
        )
    );

-- INSERT Policy: Service role and superadmins can insert, regular users restricted
CREATE POLICY "messages_insert_policy" ON messages
    FOR INSERT
    WITH CHECK (
        -- Service role can insert
        auth.role() = 'service_role'
        OR
        -- Superadmins can insert any message
        is_user_superadmin(auth.uid())
        OR
        -- Regular users can insert messages for accessible threads
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM threads t 
                WHERE t.thread_id = messages.thread_id 
                AND t.bot_share_name = ANY(get_user_accessible_bots(auth.uid()))
            )
        )
    );

-- UPDATE Policy: Service role and superadmins can update, regular users restricted
CREATE POLICY "messages_update_policy" ON messages
    FOR UPDATE
    USING (
        -- Service role can update
        auth.role() = 'service_role'
        OR
        -- Superadmins can update any message
        is_user_superadmin(auth.uid())
        OR
        -- Regular users can update messages for accessible threads
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM threads t 
                WHERE t.thread_id = messages.thread_id 
                AND t.bot_share_name = ANY(get_user_accessible_bots(auth.uid()))
            )
        )
    );

-- DELETE Policy: Only service role and superadmins
CREATE POLICY "messages_delete_policy" ON messages
    FOR DELETE
    USING (
        -- Service role can delete
        auth.role() = 'service_role'
        OR
        -- Superadmins can delete any message
        is_user_superadmin(auth.uid())
    );

-- Grant permissions
GRANT ALL ON messages TO service_role;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
