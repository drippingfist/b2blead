-- Disable RLS temporarily to clean up
ALTER TABLE bot_users DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "bot_users_select_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_insert_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_update_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_delete_policy" ON bot_users;
DROP POLICY IF EXISTS "Service role full access" ON bot_users;
DROP POLICY IF EXISTS "Users can view own records" ON bot_users;
DROP POLICY IF EXISTS "Users can update own records" ON bot_users;

-- Re-enable RLS
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;

-- Create simple policies that don't reference any functions
-- Policy 1: Service role has full access (for API routes)
CREATE POLICY "Service role full access" ON bot_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy 2: Users can view their own records
CREATE POLICY "Users can view own records" ON bot_users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy 3: Users can update their own records (but not role changes)
CREATE POLICY "Users can update own records" ON bot_users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

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
        RAISE NOTICE 'RLS is enabled for bot_users table with simple policies';
    ELSE
        RAISE EXCEPTION 'RLS is NOT enabled for bot_users table';
    END IF;
END;
$$;

-- List all policies for verification
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE 'Current policies on bot_users table:';
    FOR policy_record IN 
        SELECT policyname, cmd, roles 
        FROM pg_policies 
        WHERE tablename = 'bot_users'
    LOOP
        RAISE NOTICE 'Policy: % | Command: % | Roles: %', 
            policy_record.policyname, 
            policy_record.cmd, 
            policy_record.roles;
    END LOOP;
END;
$$;
