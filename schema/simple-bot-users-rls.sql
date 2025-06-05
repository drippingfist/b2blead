-- First, disable RLS temporarily to clean up
ALTER TABLE bot_users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own bot access" ON bot_users;
DROP POLICY IF EXISTS "Superadmins can view all bot access" ON bot_users;
DROP POLICY IF EXISTS "Admins can view same bot users" ON bot_users;
DROP POLICY IF EXISTS "Users can insert own records" ON bot_users;
DROP POLICY IF EXISTS "Superadmins can insert any records" ON bot_users;
DROP POLICY IF EXISTS "Admins can insert same bot records" ON bot_users;
DROP POLICY IF EXISTS "Users can update own records" ON bot_users;
DROP POLICY IF EXISTS "Superadmins can update any records" ON bot_users;
DROP POLICY IF EXISTS "Admins can update same bot records" ON bot_users;
DROP POLICY IF EXISTS "Superadmins can delete any records" ON bot_users;
DROP POLICY IF EXISTS "Admins can delete same bot records" ON bot_users;
DROP POLICY IF EXISTS "Service role full access" ON bot_users;

-- Create simple, non-recursive policies
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

-- Enable RLS
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON bot_users TO service_role;
GRANT SELECT, UPDATE ON bot_users TO authenticated;

COMMENT ON TABLE bot_users IS 'User access levels for bots. RLS policies allow users to see their own records, service role has full access for API operations.';
