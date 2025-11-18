-- =====================================================
-- Migration: Cleanup Zombie Accounts + Delete User Account Function
-- Created: 2025-11-18 00:00:00 UTC
-- Description: Removes users from auth.users who don't have profiles
--              AND creates function for account deletion
-- 
-- Context:
--   Zombie accounts are users in auth.users without corresponding profiles.
--   This can happen when:
--   - Profile deletion occurred without deleting the auth user
--   - Database inconsistencies or manual deletions
--   - Bugs in account deletion flow
--
-- This migration:
--   1. Creates a function to delete user accounts (delete_user_account)
--   2. Creates a function to find and delete zombie accounts
--   3. Executes the cleanup
--   4. Reports the number of accounts cleaned up
-- =====================================================

-- =====================================================
-- Function: delete_user_account
-- Purpose: Deletes a user from auth.users (with CASCADE)
-- Returns: void
-- Security: SECURITY DEFINER to bypass RLS and auth schema restrictions
-- =====================================================
CREATE OR REPLACE FUNCTION public.delete_user_account(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the user from auth.users
  -- This will CASCADE delete:
  -- - profiles (ON DELETE CASCADE)
  -- - notes (ON DELETE CASCADE)
  -- - travel_plans (ON DELETE CASCADE via notes)
  DELETE FROM auth.users WHERE id = user_id;
  
  -- Note: If user doesn't exist, this is a no-op (no error)
END;
$$;

COMMENT ON FUNCTION public.delete_user_account IS 
  'Deletes a user from auth.users with CASCADE deletion of all related data. Requires SECURITY DEFINER to access auth schema.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;

-- =====================================================
-- Function: cleanup_zombie_accounts
-- Purpose: Deletes users from auth.users who don't have profiles
-- Returns: Number of accounts deleted
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_zombie_accounts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accounts_deleted INTEGER := 0;
  user_record RECORD;
BEGIN
  -- Find all users in auth.users without profiles
  FOR user_record IN 
    SELECT 
      au.id,
      au.email,
      au.created_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    -- Log the zombie account we're about to delete
    RAISE NOTICE 'Deleting zombie account: % (created: %)', user_record.email, user_record.created_at;
    
    -- Delete from auth.users
    -- This will cascade delete related data due to ON DELETE CASCADE
    DELETE FROM auth.users WHERE id = user_record.id;
    
    accounts_deleted := accounts_deleted + 1;
  END LOOP;
  
  RETURN accounts_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_zombie_accounts IS 
  'Removes zombie accounts (users in auth.users without profiles). Returns count of accounts deleted.';

-- =====================================================
-- Execute the cleanup
-- =====================================================
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Run the cleanup function
  deleted_count := public.cleanup_zombie_accounts();
  
  -- Log the result
  RAISE NOTICE 'Zombie accounts cleanup completed. Deleted % account(s).', deleted_count;
END $$;

-- =====================================================
-- Migration Complete
-- 
-- The function cleanup_zombie_accounts() remains available for future use:
--   SELECT public.cleanup_zombie_accounts();
--
-- To check for zombie accounts before cleanup:
--   SELECT au.email, au.id, au.created_at 
--   FROM auth.users au
--   LEFT JOIN public.profiles p ON au.id = p.id
--   WHERE p.id IS NULL;
-- =====================================================

