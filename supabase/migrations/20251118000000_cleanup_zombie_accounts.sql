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
-- NOTE: User deletion is now handled by Supabase Admin API
-- =====================================================
-- The delete_user_account() function has been REMOVED because:
-- 1. Users don't have permissions to modify auth.users schema (even with SECURITY DEFINER)
-- 2. The correct way to delete users is via Supabase Admin API: admin.deleteUser()
-- 3. Admin API automatically triggers CASCADE deletion of all related data
-- 4. This approach is more secure and follows Supabase best practices
--
-- Account deletion is now implemented in: src/pages/api/profiles/me.ts (DELETE endpoint)
-- It uses: supabaseAdmin.auth.admin.deleteUser(userId)
-- =====================================================

-- =====================================================
-- Function: find_zombie_accounts
-- Purpose: Identifies users in auth.users without profiles (diagnostic only)
-- Returns: Table of zombie account details
-- =====================================================
CREATE OR REPLACE FUNCTION public.find_zombie_accounts()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Find all users in auth.users without profiles
  RETURN QUERY
  SELECT 
    au.id AS user_id,
    au.email::TEXT AS email,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL
  ORDER BY au.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.find_zombie_accounts IS 
  'Diagnostic function to identify zombie accounts (users in auth.users without profiles). Does not delete anything. Use Supabase Admin API to delete these accounts if needed.';

-- =====================================================
-- Check for existing zombie accounts
-- =====================================================
DO $$
DECLARE
  zombie_count INTEGER;
BEGIN
  -- Count zombie accounts
  SELECT COUNT(*) INTO zombie_count
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL;
  
  -- Log the result
  IF zombie_count > 0 THEN
    RAISE NOTICE '⚠️  Found % zombie account(s). Use find_zombie_accounts() to list them.', zombie_count;
    RAISE NOTICE '⚠️  These accounts must be cleaned up manually using Supabase Admin API or Dashboard.';
  ELSE
    RAISE NOTICE '✅ No zombie accounts found.';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- 
-- To find zombie accounts:
--   SELECT * FROM public.find_zombie_accounts();
--
-- To delete zombie accounts, use one of these methods:
-- 
-- Method 1: Supabase Dashboard
--   Go to Authentication → Users → find user → click "..." → Delete user
--
-- Method 2: Admin API (in your backend code)
--   const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
--
-- Method 3: SQL (manual, for each user)
--   -- This requires direct database access and should be used as last resort
--   DELETE FROM auth.users WHERE id = '<user-id>';
-- =====================================================

