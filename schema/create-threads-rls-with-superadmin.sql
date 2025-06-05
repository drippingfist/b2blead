-- First, ensure RLS is enabled on threads table
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "threads_select_policy" ON threads;
DROP POLICY IF EXISTS "threads_insert_policy" ON threads;
DROP POLICY IF EXISTS "threads_update_policy" ON threads;
DROP POLICY IF EXISTS "threads_delete_policy" ON threads;

-- Create a function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_user_superadmin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bot_super_users 
    WHERE id = user_uuid
  );
$$;

-- Create a function to get user's accessible bot names
CREATE OR REPLACE FUNCTION get_user_accessible_bots(user_uuid UUID)
RETURNS TEXT[]
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(bot_share_name) 
  FROM bot_users 
  WHERE user_id = user_uuid 
    AND is_active = true 
    AND bot_share_name IS NOT NULL;
$$;

-- SELECT Policy: Superadmins see all, regular users see only their assigned bots
CREATE POLICY "threads_select_policy" ON threads
    FOR SELECT
    USING (
        -- Service role can see everything (for API routes)
        auth.role() = 'service_role'
        OR
        -- Superadmins can see all threads
        is_user_superadmin(auth.uid())
        OR
        -- Regular users can only see threads for their assigned bots
        (
            auth.uid() IS NOT NULL 
            AND bot_share_name = ANY(get_user_accessible_bots(auth.uid()))
        )
    );

-- INSERT Policy: Service role and superadmins can insert anything, regular users restricted
CREATE POLICY "threads_insert_policy" ON threads
    FOR INSERT
    WITH CHECK (
        -- Service role can insert (for API routes)
        auth.role() = 'service_role'
        OR
        -- Superadmins can insert any thread
        is_user_superadmin(auth.uid())
        OR
        -- Regular users can only insert threads for their assigned bots
        (
            auth.uid() IS NOT NULL 
            AND bot_share_name = ANY(get_user_accessible_bots(auth.uid()))
        )
    );

-- UPDATE Policy: Service role and superadmins can update anything, regular users restricted
CREATE POLICY "threads_update_policy" ON threads
    FOR UPDATE
    USING (
        -- Service role can update (for API routes)
        auth.role() = 'service_role'
        OR
        -- Superadmins can update any thread
        is_user_superadmin(auth.uid())
        OR
        -- Regular users can only update threads for their assigned bots
        (
            auth.uid() IS NOT NULL 
            AND bot_share_name = ANY(get_user_accessible_bots(auth.uid()))
        )
    )
    WITH CHECK (
        -- Service role can update anything
        auth.role() = 'service_role'
        OR
        -- Superadmins can update any thread
        is_user_superadmin(auth.uid())
        OR
        -- Regular users can only update threads for their assigned bots
        (
            auth.uid() IS NOT NULL 
            AND bot_share_name = ANY(get_user_accessible_bots(auth.uid()))
        )
    );

-- DELETE Policy: Only service role and superadmins can delete
CREATE POLICY "threads_delete_policy" ON threads
    FOR DELETE
    USING (
        -- Service role can delete (for API routes)
        auth.role() = 'service_role'
        OR
        -- Superadmins can delete any thread
        is_user_superadmin(auth.uid())
    );

-- Grant necessary permissions
GRANT ALL ON threads TO service_role;
GRANT SELECT, INSERT, UPDATE ON threads TO authenticated;

-- Test the functions
DO $$
BEGIN
    RAISE NOTICE 'RLS policies for threads table have been created successfully';
    RAISE NOTICE 'Superadmins will bypass all restrictions';
    RAISE NOTICE 'Regular users will only see threads for their assigned bots';
END;
$$;
