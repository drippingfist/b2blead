-- Migrate existing superadmin users from bot_users to bot_super_users
INSERT INTO bot_super_users (id, created_at, is_active, notes)
SELECT DISTINCT 
    id, 
    NOW(), 
    true, 
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
SELECT 'Superadmin users migrated:' as status, COUNT(*) as count FROM bot_super_users WHERE is_active = true;
SELECT 'Remaining superadmin roles in bot_users:' as status, COUNT(*) as count FROM bot_users WHERE role = 'superadmin';
