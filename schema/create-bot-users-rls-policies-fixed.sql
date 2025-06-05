-- First, disable RLS temporarily and drop existing policies
ALTER TABLE public.bot_users DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bot_users_select_policy ON public.bot_users;
DROP POLICY IF EXISTS bot_users_insert_policy ON public.bot_users;
DROP POLICY IF EXISTS bot_users_update_policy ON public.bot_users;
DROP POLICY IF EXISTS bot_users_delete_policy ON public.bot_users;

-- Create comprehensive RLS policies for bot_users table

-- SELECT policy: Users can see their own records, admins can see records for their bots, superadmins see all
CREATE POLICY bot_users_select_policy
  ON public.bot_users
  FOR SELECT
  USING (
    -- Service role can see everything
    auth.role() = 'service_role'
    OR
    -- Users can see their own records
    id = auth.uid()::text
    OR
    -- Superadmins can see everything
    public.is_superadmin()
    OR
    -- Admins can see records for bots they manage
    (
      public.get_current_user_role() = 'admin'
      AND EXISTS (
        SELECT 1 
        FROM bot_users admin_check
        WHERE admin_check.id = auth.uid()::text
          AND admin_check.bot_share_name = bot_users.bot_share_name
          AND admin_check.role = 'admin'
          AND admin_check.is_active = true
      )
    )
  );

-- INSERT policy: Superadmins can insert anything, admins can insert for their bots
CREATE POLICY bot_users_insert_policy
  ON public.bot_users
  FOR INSERT
  WITH CHECK (
    -- Service role can insert anything
    auth.role() = 'service_role'
    OR
    -- Superadmins can insert anything
    public.is_superadmin()
    OR
    -- Admins can insert users for bots they manage (but not superadmins)
    (
      public.get_current_user_role() = 'admin'
      AND role IN ('admin', 'member')  -- Admins cannot create superadmins
      AND EXISTS (
        SELECT 1 
        FROM bot_users admin_check
        WHERE admin_check.id = auth.uid()::text
          AND admin_check.bot_share_name = bot_users.bot_share_name
          AND admin_check.role = 'admin'
          AND admin_check.is_active = true
      )
    )
  );

-- UPDATE policy: Users can update their own records, admins can update records for their bots
CREATE POLICY bot_users_update_policy
  ON public.bot_users
  FOR UPDATE
  USING (
    -- Service role can update anything
    auth.role() = 'service_role'
    OR
    -- Superadmins can update anything
    public.is_superadmin()
    OR
    -- Users can update their own records (but not their role)
    id = auth.uid()::text
    OR
    -- Admins can update records for bots they manage
    (
      public.get_current_user_role() = 'admin'
      AND EXISTS (
        SELECT 1 
        FROM bot_users admin_check
        WHERE admin_check.id = auth.uid()::text
          AND admin_check.bot_share_name = bot_users.bot_share_name
          AND admin_check.role = 'admin'
          AND admin_check.is_active = true
      )
    )
  )
  WITH CHECK (
    -- Service role can update to anything
    auth.role() = 'service_role'
    OR
    -- Superadmins can update to anything
    public.is_superadmin()
    OR
    -- Users can update their own records but cannot change their role
    (
      id = auth.uid()::text
      AND role = (SELECT role FROM bot_users WHERE id = auth.uid()::text AND bot_share_name = bot_users.bot_share_name LIMIT 1)
    )
    OR
    -- Admins can update records for their bots (but cannot set role to superadmin)
    (
      public.get_current_user_role() = 'admin'
      AND role IN ('admin', 'member')  -- Admins cannot set role to superadmin
      AND EXISTS (
        SELECT 1 
        FROM bot_users admin_check
        WHERE admin_check.id = auth.uid()::text
          AND admin_check.bot_share_name = bot_users.bot_share_name
          AND admin_check.role = 'admin'
          AND admin_check.is_active = true
      )
    )
  );

-- DELETE policy: Superadmins can delete anything, admins can delete records for their bots
CREATE POLICY bot_users_delete_policy
  ON public.bot_users
  FOR DELETE
  USING (
    -- Service role can delete anything
    auth.role() = 'service_role'
    OR
    -- Superadmins can delete anything
    public.is_superadmin()
    OR
    -- Admins can delete records for bots they manage (except other admins and superadmins)
    (
      public.get_current_user_role() = 'admin'
      AND role = 'member'  -- Admins can only delete members, not other admins or superadmins
      AND EXISTS (
        SELECT 1 
        FROM bot_users admin_check
        WHERE admin_check.id = auth.uid()::text
          AND admin_check.bot_share_name = bot_users.bot_share_name
          AND admin_check.role = 'admin'
          AND admin_check.is_active = true
      )
    )
  );

-- Enable RLS on bot_users table
ALTER TABLE public.bot_users ENABLE ROW LEVEL SECURITY;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
