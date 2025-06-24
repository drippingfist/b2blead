-- schema/bots-rls-policy.sql

-- Enable Row Level Security on the bots table
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots FORCE ROW LEVEL SECURITY; -- Ensure RLS is enforced for table owners too

-- Drop existing policies for a clean slate
DROP POLICY IF EXISTS "Allow authenticated users to read bots" ON public.bots;
DROP POLICY IF EXISTS "Allow admins/superadmins to update bots" ON public.bots;
DROP POLICY IF EXISTS "Allow service_role full access to bots" ON public.bots;
DROP POLICY IF EXISTS "Allow superadmins to insert bots" ON public.bots;
DROP POLICY IF EXISTS "Allow superadmins to delete bots" ON public.bots;


-- Policy 1: Service role has full access
CREATE POLICY "Allow service_role full access to bots" ON public.bots
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy 2: Authenticated users can read all bot details (for bot selector, etc.)
CREATE POLICY "Allow authenticated users to read bots" ON public.bots
    FOR SELECT
    TO authenticated
    USING (true); -- Allows reading all bots for selection purposes

-- Policy 3: Admins/Superadmins can update bots they have access to
-- This policy uses helper functions `is_superadmin()` and `is_admin_for_bot(bot_share_name)`
-- Ensure these functions are defined and accessible as per `consolidated-security-functions.sql`
CREATE POLICY "Allow admins/superadmins to update bots" ON public.bots
    FOR UPDATE
    TO authenticated
    USING (
        public.is_superadmin() -- Superadmins can update any bot
        OR
        (public.get_current_user_role() = 'admin' AND public.is_admin_for_bot(bot_share_name)) -- Admins can update bots they are admin for
    )
    WITH CHECK ( -- Same condition for WITH CHECK
        public.is_superadmin()
        OR
        (public.get_current_user_role() = 'admin' AND public.is_admin_for_bot(bot_share_name))
    );

-- Policy 4: Allow superadmins to insert new bots
CREATE POLICY "Allow superadmins to insert bots" ON public.bots
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_superadmin());

-- Policy 5: Allow superadmins to delete bots
CREATE POLICY "Allow superadmins to delete bots" ON public.bots
    FOR DELETE
    TO authenticated
    USING (public.is_superadmin());


-- Grant necessary permissions on the table
GRANT SELECT ON public.bots TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.bots TO authenticated; -- RLS policies will restrict actual operations
GRANT ALL ON public.bots TO service_role;

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies for `bots` table updated successfully.';
    RAISE NOTICE '   - Authenticated users can read all bots.';
    RAISE NOTICE '   - Admins can update bots they are admin for.';
    RAISE NOTICE '   - Superadmins can update, insert, and delete all bots.';
    RAISE NOTICE '   - Service role has full access.';
    RAISE NOTICE '   - Ensure helper functions (is_superadmin, is_admin_for_bot, get_current_user_role) are correctly defined and granted.';
END $$;
