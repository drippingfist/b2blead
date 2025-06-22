-- CONSOLIDATED RLS POLICIES - SECURITY CRITICAL
-- This file replaces ALL other RLS policy files
-- CRITICAL FIX: Uses user_id (FK to auth.users) instead of id (PK of bot_users)

-- ============================================================================
-- BOT_USERS TABLE RLS POLICIES
-- ============================================================================

-- Clean slate: disable RLS and drop all existing policies
ALTER TABLE bot_users DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bot_users_select_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_insert_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_update_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_delete_policy" ON bot_users;
DROP POLICY IF EXISTS "Service role full access" ON bot_users;
DROP POLICY IF EXISTS "Users can view own records" ON bot_users;
DROP POLICY IF EXISTS "Users can update own records" ON bot_users;

-- Re-enable RLS
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role has full access (for API routes and admin operations)
CREATE POLICY "Service role full access" ON bot_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy 2: Users can view their own records
-- CRITICAL FIX: Use user_id (FK), not id (PK)
CREATE POLICY "Users can view own records" ON bot_users
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());  -- CRITICAL FIX

-- Policy 3: Users can update their own records (but not role changes)
-- CRITICAL FIX: Use user_id (FK), not id (PK)
CREATE POLICY "Users can update own records" ON bot_users
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())  -- CRITICAL FIX
    WITH CHECK (user_id = auth.uid());  -- CRITICAL FIX

-- Grant permissions
GRANT ALL ON bot_users TO service_role;
GRANT SELECT, UPDATE ON bot_users TO authenticated;

-- ============================================================================
-- THREADS TABLE RLS POLICIES
-- ============================================================================

ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "threads_select_policy" ON threads;
DROP POLICY IF EXISTS "threads_insert_policy" ON threads;
DROP POLICY IF EXISTS "threads_update_policy" ON threads;
DROP POLICY IF EXISTS "threads_delete_policy" ON threads;

-- SELECT Policy: Users can see threads for their accessible bots
CREATE POLICY "threads_select_policy" ON threads
    FOR SELECT
    USING (
        -- Service role can see everything
        auth.role() = 'service_role'
        OR
        -- Users can see threads for bots they have access to
        (
            auth.uid() IS NOT NULL 
            AND bot_share_name = ANY(public.get_user_accessible_bots())
        )
    );

-- INSERT Policy: Service role can insert, users can insert for accessible bots
CREATE POLICY "threads_insert_policy" ON threads
    FOR INSERT
    WITH CHECK (
        -- Service role can insert
        auth.role() = 'service_role'
        OR
        -- Users can insert threads for accessible bots
        (
            auth.uid() IS NOT NULL 
            AND bot_share_name = ANY(public.get_user_accessible_bots())
        )
    );

-- UPDATE Policy: Service role can update, users can update accessible threads
CREATE POLICY "threads_update_policy" ON threads
    FOR UPDATE
    USING (
        -- Service role can update
        auth.role() = 'service_role'
        OR
        -- Users can update threads for accessible bots
        (
            auth.uid() IS NOT NULL 
            AND bot_share_name = ANY(public.get_user_accessible_bots())
        )
    );

-- DELETE Policy: Only service role can delete
CREATE POLICY "threads_delete_policy" ON threads
    FOR DELETE
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON threads TO service_role;
GRANT SELECT, INSERT, UPDATE ON threads TO authenticated;

-- ============================================================================
-- MESSAGES TABLE RLS POLICIES
-- ============================================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;

-- SELECT Policy: Users can see messages for threads they can access
CREATE POLICY "messages_select_policy" ON messages
    FOR SELECT
    USING (
        -- Service role can see everything
        auth.role() = 'service_role'
        OR
        -- Users can see messages for accessible threads
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM threads t 
                WHERE t.thread_id = messages.thread_id 
                AND t.bot_share_name = ANY(public.get_user_accessible_bots())
            )
        )
    );

-- INSERT Policy: Service role can insert, users can insert for accessible threads
CREATE POLICY "messages_insert_policy" ON messages
    FOR INSERT
    WITH CHECK (
        -- Service role can insert
        auth.role() = 'service_role'
        OR
        -- Users can insert messages for accessible threads
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM threads t 
                WHERE t.thread_id = messages.thread_id 
                AND t.bot_share_name = ANY(public.get_user_accessible_bots())
            )
        )
    );

-- UPDATE Policy: Service role can update, users can update accessible messages
CREATE POLICY "messages_update_policy" ON messages
    FOR UPDATE
    USING (
        -- Service role can update
        auth.role() = 'service_role'
        OR
        -- Users can update messages for accessible threads
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM threads t 
                WHERE t.thread_id = messages.thread_id 
                AND t.bot_share_name = ANY(public.get_user_accessible_bots())
            )
        )
    );

-- DELETE Policy: Only service role can delete
CREATE POLICY "messages_delete_policy" ON messages
    FOR DELETE
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON messages TO service_role;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;

-- ============================================================================
-- VERIFICATION AND CLEANUP
-- ============================================================================

-- Verify RLS is enabled
DO $$
DECLARE
    table_name TEXT;
    rls_enabled BOOLEAN;
BEGIN
    FOR table_name IN VALUES ('bot_users'), ('threads'), ('messages') LOOP
        SELECT relrowsecurity INTO rls_enabled 
        FROM pg_class 
        WHERE relname = table_name;
        
        IF rls_enabled THEN
            RAISE NOTICE '✅ RLS enabled for table: %', table_name;
        ELSE
            RAISE EXCEPTION '❌ RLS NOT enabled for table: %', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🔒 CRITICAL SECURITY FIX APPLIED:';
    RAISE NOTICE '   - All RLS policies now use user_id (FK) instead of id (PK)';
    RAISE NOTICE '   - This prevents unauthorized access to chat data';
    RAISE NOTICE '   - Users can only see data for their assigned bots';
END $$;
