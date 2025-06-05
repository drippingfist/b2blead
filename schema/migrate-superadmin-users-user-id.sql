-- Migrate existing superadmin users from bot_users to bot_super_users
-- Using user_id instead of id
INSERT INTO bot_super_users (id, created_at, notes)
SELECT DISTINCT 
    user_id, 
    NOW(), 
    'Migrated from bot_users table'
FROM bot_users 
WHERE role = 'superadmin' 
    AND is_active = true
ON CONFLICT (id) DO NOTHING;

-- Update bot_users to remove superadmin role (convert to admin)
UPDATE bot_users 
SET role = 'admin' 
WHERE role = 'superadmin';

-- Verify the migration
SELECT 'Superadmin users migrated:' as status, COUNT(*) as count FROM bot_super_users;
SELECT 'Remaining superadmin roles in bot_users:' as status, COUNT(*) as count FROM bot_users WHERE role = 'superadmin';
SELECT 'Total bot assignments:' as status, COUNT(*) as count FROM bot_users WHERE is_active = true;
