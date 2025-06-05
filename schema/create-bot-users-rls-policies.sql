-- Enable RLS on bot_users table
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "bot_users_select_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_insert_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_update_policy" ON bot_users;
DROP POLICY IF EXISTS "bot_users_delete_policy" ON bot_users;

-- SELECT Policy: Users can see their own records + superadmins can see all
CREATE POLICY "bot_users_select_policy" ON bot_users
    FOR SELECT
    USING (
        -- Service role can see everything (for API routes)
        auth.role() = 'service_role'
        OR
        -- Users can see their own records
        id = auth.uid()
        OR
        -- Superadmins can see all records (using our SECURITY DEFINER function)
        is_superadmin()
    );

-- INSERT Policy: Only superadmins can create new bot_user assignments
CREATE POLICY "bot_users_insert_policy" ON bot_users
    FOR INSERT
    WITH CHECK (
        -- Service role can insert (for API routes)
        auth.role() = 'service_role'
        OR
        -- Only superadmins can create new assignments
        is_superadmin()
    );

-- UPDATE Policy: Superadmins can update any record, users can update their own non-critical fields
CREATE POLICY "bot_users_update_policy" ON bot_users
    FOR UPDATE
    USING (
        -- Service role can update (for API routes)
        auth.role() = 'service_role'
        OR
        -- Superadmins can update any record
        is_superadmin()
        OR
        -- Users can update their own records (but role changes will be restricted by CHECK)
        id = auth.uid()
    )
    WITH CHECK (
        -- Service role can update anything
        auth.role() = 'service_role'
        OR
        -- Superadmins can update anything
        is_superadmin()
        OR
        -- Regular users can only update non-critical fields of their own records
        (id = auth.uid() AND role = OLD.role AND bot_share_name = OLD.bot_share_name)
    );

-- DELETE Policy: Only superadmins can delete bot_user assignments
CREATE POLICY "bot_users_delete_policy" ON bot_users
    FOR DELETE
    USING (
        -- Service role can delete (for API routes)
        auth.role() = 'service_role'
        OR
        -- Only superadmins can delete assignments
        is_superadmin()
    );
