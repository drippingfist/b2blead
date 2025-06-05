-- Script to add all bots to superadmin users' bot_users entries

-- First, identify all superadmin users
WITH superadmins AS (
  SELECT id FROM bot_super_users
)

-- Then, for each superadmin and each bot, insert a record if it doesn't exist
INSERT INTO bot_users (user_id, bot_share_name, role, is_active)
SELECT 
  s.id AS user_id,
  b.bot_share_name,
  'superadmin' AS role,
  true AS is_active
FROM 
  superadmins s
CROSS JOIN 
  (SELECT bot_share_name FROM bots WHERE bot_share_name IS NOT NULL) b
WHERE 
  NOT EXISTS (
    SELECT 1 
    FROM bot_users bu 
    WHERE bu.user_id = s.id AND bu.bot_share_name = b.bot_share_name
  );

-- Create a trigger function to automatically add new bots to superadmins
CREATE OR REPLACE FUNCTION add_bot_to_superadmins()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new bot is created, add it to all superadmins
  IF NEW.bot_share_name IS NOT NULL THEN
    INSERT INTO bot_users (user_id, bot_share_name, role, is_active)
    SELECT 
      id AS user_id,
      NEW.bot_share_name,
      'superadmin' AS role,
      true AS is_active
    FROM 
      bot_super_users
    WHERE 
      NOT EXISTS (
        SELECT 1 
        FROM bot_users bu 
        WHERE bu.user_id = bot_super_users.id AND bu.bot_share_name = NEW.bot_share_name
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger on the bots table
DROP TRIGGER IF EXISTS add_bot_to_superadmins_trigger ON bots;
CREATE TRIGGER add_bot_to_superadmins_trigger
AFTER INSERT OR UPDATE ON bots
FOR EACH ROW
EXECUTE FUNCTION add_bot_to_superadmins();

-- Create a trigger function to add all bots to new superadmins
CREATE OR REPLACE FUNCTION add_bots_to_new_superadmin()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new superadmin is created, add all bots to them
  INSERT INTO bot_users (user_id, bot_share_name, role, is_active)
  SELECT 
    NEW.id AS user_id,
    b.bot_share_name,
    'superadmin' AS role,
    true AS is_active
  FROM 
    bots b
  WHERE 
    b.bot_share_name IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 
      FROM bot_users bu 
      WHERE bu.user_id = NEW.id AND bu.bot_share_name = b.bot_share_name
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger on the bot_super_users table
DROP TRIGGER IF EXISTS add_bots_to_new_superadmin_trigger ON bot_super_users;
CREATE TRIGGER add_bots_to_new_superadmin_trigger
AFTER INSERT ON bot_super_users
FOR EACH ROW
EXECUTE FUNCTION add_bots_to_new_superadmin();

-- Output the results
DO $$
DECLARE
  superadmin_count INTEGER;
  bot_count INTEGER;
  entry_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO superadmin_count FROM bot_super_users;
  SELECT COUNT(*) INTO bot_count FROM bots WHERE bot_share_name IS NOT NULL;
  SELECT COUNT(*) INTO entry_count FROM bot_users bu 
    JOIN bot_super_users bsu ON bu.user_id = bsu.id;
  
  RAISE NOTICE 'Added bot access for % superadmins to % bots (% total entries)', 
    superadmin_count, bot_count, entry_count;
END;
$$;
