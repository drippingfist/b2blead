-- Create the bot_super_users table
CREATE TABLE IF NOT EXISTS bot_super_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    notes TEXT
);

-- Enable RLS on bot_super_users
ALTER TABLE bot_super_users ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bot_super_users_id ON bot_super_users(id);
CREATE INDEX IF NOT EXISTS idx_bot_super_users_active ON bot_super_users(is_active);

-- RLS Policies for bot_super_users (read-only from app)
DROP POLICY IF EXISTS "bot_super_users_select_policy" ON bot_super_users;
DROP POLICY IF EXISTS "bot_super_users_insert_policy" ON bot_super_users;
DROP POLICY IF EXISTS "bot_super_users_update_policy" ON bot_super_users;
DROP POLICY IF EXISTS "bot_super_users_delete_policy" ON bot_super_users;

-- SELECT: Service role can read everything, users can read their own record
CREATE POLICY "bot_super_users_select_policy" ON bot_super_users
    FOR SELECT
    USING (
        -- Service role can see everything (for API routes)
        auth.role() = 'service_role'
        OR
        -- Users can see their own record
        id = auth.uid()
    );

-- INSERT/UPDATE/DELETE: Only service role (no app writes)
CREATE POLICY "bot_super_users_insert_policy" ON bot_super_users
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "bot_super_users_update_policy" ON bot_super_users
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "bot_super_users_delete_policy" ON bot_super_users
    FOR DELETE
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON bot_super_users TO service_role;
GRANT SELECT ON bot_super_users TO authenticated;
