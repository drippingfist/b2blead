-- Enable RLS on bot_users table
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;

-- Check if policies exist and create them if they don't
DO $$
BEGIN
    -- Policy 1: Service role has full access (for API routes)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bot_users' AND policyname = 'Service role full access') THEN
        CREATE POLICY "Service role full access" ON bot_users
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;

    -- Policy 2: Users can view their own records
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bot_users' AND policyname = 'Users can view own records') THEN
        CREATE POLICY "Users can view own records" ON bot_users
            FOR SELECT
            TO authenticated
            USING (auth.uid() = id);
    END IF;

    -- Policy 3: Users can update their own records (but not role changes)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bot_users' AND policyname = 'Users can update own records') THEN
        CREATE POLICY "Users can update own records" ON bot_users
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);
    END IF;
END
$$;

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
END
$$;
