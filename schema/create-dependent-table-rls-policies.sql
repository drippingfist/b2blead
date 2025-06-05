-- Enable RLS on dependent tables
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE callbacks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "bots_select_policy" ON bots;
DROP POLICY IF EXISTS "threads_select_policy" ON threads;
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "callbacks_select_policy" ON callbacks;

-- BOTS table policies
CREATE POLICY "bots_select_policy" ON bots
    FOR SELECT
    USING (
        -- Service role can see everything
        auth.role() = 'service_role'
        OR
        -- Superadmins can see all bots
        is_superadmin()
        OR
        -- Users can see bots they have access to
        bot_share_name = ANY(get_user_accessible_bots())
    );

-- THREADS table policies
CREATE POLICY "threads_select_policy" ON threads
    FOR SELECT
    USING (
        -- Service role can see everything
        auth.role() = 'service_role'
        OR
        -- Superadmins can see all threads
        is_superadmin()
        OR
        -- Users can see threads for bots they have access to
        bot_share_name = ANY(get_user_accessible_bots())
    );

-- MESSAGES table policies
CREATE POLICY "messages_select_policy" ON messages
    FOR SELECT
    USING (
        -- Service role can see everything
        auth.role() = 'service_role'
        OR
        -- Superadmins can see all messages
        is_superadmin()
        OR
        -- Users can see messages for threads of bots they have access to
        EXISTS (
            SELECT 1 FROM threads 
            WHERE threads.id = messages.thread_id 
              AND threads.bot_share_name = ANY(get_user_accessible_bots())
        )
    );

-- CALLBACKS table policies
CREATE POLICY "callbacks_select_policy" ON callbacks
    FOR SELECT
    USING (
        -- Service role can see everything
        auth.role() = 'service_role'
        OR
        -- Superadmins can see all callbacks
        is_superadmin()
        OR
        -- Users can see callbacks for bots they have access to
        bot_share_name = ANY(get_user_accessible_bots())
    );
