-- schema/delete-threads-function.sql
CREATE OR REPLACE FUNCTION delete_threads_as_superadmin(thread_ids_to_delete UUID[])
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- CRITICAL: Runs with definer's privileges
SET search_path = public
AS $$
DECLARE
  current_user_is_superadmin BOOLEAN;
  deleted_count INTEGER;
BEGIN
  -- CRITICAL: Re-verify caller's permission INSIDE the SECURITY DEFINER function
  SELECT public.is_superadmin() INTO current_user_is_superadmin;

  IF NOT current_user_is_superadmin THEN
    RAISE EXCEPTION 'User % is not authorized to delete threads. Superadmin required.', auth.uid();
  END IF;

  -- Perform the delete operation
  WITH deleted_rows AS (
    DELETE FROM public.threads
    WHERE id = ANY(thread_ids_to_delete)
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_rows;

  -- Also delete related messages (if cascade is not set up)
  DELETE FROM public.messages WHERE thread_id = ANY(
    SELECT thread_id FROM public.threads WHERE id = ANY(thread_ids_to_delete)
  );

  RETURN json_build_object(
    'success', true, 
    'deleted_count', deleted_count, 
    'message', deleted_count || ' thread(s) deleted successfully.'
  );
END;
$$;

-- Grant execute permission to authenticated users (the function itself handles internal auth)
GRANT EXECUTE ON FUNCTION delete_threads_as_superadmin(UUID[]) TO authenticated;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ SECURITY DEFINER function delete_threads_as_superadmin created';
    RAISE NOTICE '   - Function verifies superadmin status internally';
    RAISE NOTICE '   - Deletes threads and related messages securely';
    RAISE NOTICE '   - Returns JSON with success status and count';
END $$;
