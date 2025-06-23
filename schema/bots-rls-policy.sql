-- schema/bots-rls-policy.sql

-- Enable Row Level Security on the bots table
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policy if it exists, for a clean slate
DROP POLICY IF EXISTS "Allow authenticated users to read bots" ON public.bots;

-- Create a new SELECT policy
-- This policy allows any user who is logged in (authenticated) to view all rows in the bots table.
-- This is necessary for components like the bot selector dropdown to function correctly.
CREATE POLICY "Allow authenticated users to read bots"
ON public.bots
FOR SELECT
TO authenticated
USING (true);

-- Grant SELECT permissions to the authenticated role
GRANT SELECT ON public.bots TO authenticated;

-- Grant all permissions to the service_role for backend operations
GRANT ALL ON public.bots TO service_role;

-- Log a confirmation message
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policy for `bots` table created successfully. Authenticated users can now read bot information.';
END $$;
