-- Function to check if RLS is enabled on a table
CREATE OR REPLACE FUNCTION check_rls_status(table_name text)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'table_name', schemaname || '.' || tablename,
    'rls_enabled', rowsecurity,
    'rls_forced', relforcerowsecurity
  ) INTO result
  FROM pg_tables pt
  JOIN pg_class pc ON pc.relname = pt.tablename
  WHERE pt.tablename = table_name
  AND pt.schemaname = 'public';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
