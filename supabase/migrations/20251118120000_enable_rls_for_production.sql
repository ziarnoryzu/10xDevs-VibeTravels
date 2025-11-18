-- =====================================================
-- Migration: Enable RLS for Production
-- Created: 2025-11-18 12:00:00 UTC
-- Description: Re-enables Row Level Security and restores all security policies
-- 
-- IMPORTANT: This migration should only be applied to PRODUCTION environment
-- DO NOT run this in local development - it will break the dev setup
-- 
-- Tables Affected:
--   - profiles: RLS enabled + policies restored
--   - notes: RLS enabled + policies restored
--   - travel_plans: RLS enabled + policies restored
--
-- Prerequisites:
--   1. Verify trigger on_auth_user_created is enabled (see scripts/check_trigger_status.sql)
--   2. Remove manual profile creation from /api/auth/register if trigger is working
--   3. Test delete_user_account() function works with RLS enabled
-- =====================================================

-- =====================================================
-- Step 1: Enable Row Level Security on all tables
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_plans ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Step 2: Restore RLS Policies for profiles table
-- =====================================================

-- DROP existing policies if any (idempotent)
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON profiles;

-- SELECT policy for authenticated users
CREATE POLICY "Authenticated users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

COMMENT ON POLICY "Authenticated users can view their own profile" ON profiles IS 
  'Allows authenticated users to read their own profile data only';

-- UPDATE policy for authenticated users
CREATE POLICY "Authenticated users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

COMMENT ON POLICY "Authenticated users can update their own profile" ON profiles IS 
  'Allows authenticated users to modify their own profile data only';

-- INSERT policy for authenticated users
-- This already exists from 20251104120000_create_profile_trigger.sql
-- But we recreate it here for completeness
CREATE POLICY "Authenticated users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

COMMENT ON POLICY "Authenticated users can insert their own profile" ON profiles IS 
  'Allows authenticated users to create their own profile entry. Used by handle_new_user trigger.';

-- =====================================================
-- Step 3: Restore RLS Policies for notes table
-- =====================================================

-- DROP existing policies if any (idempotent)
DROP POLICY IF EXISTS "Authenticated users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Authenticated users can create their own notes" ON notes;
DROP POLICY IF EXISTS "Authenticated users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Authenticated users can delete their own notes" ON notes;

-- SELECT policy for authenticated users
CREATE POLICY "Authenticated users can view their own notes"
  ON notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Authenticated users can view their own notes" ON notes IS 
  'Allows authenticated users to read only their own notes';

-- INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create their own notes"
  ON notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Authenticated users can create their own notes" ON notes IS 
  'Allows authenticated users to create notes where they are the owner';

-- UPDATE policy for authenticated users
CREATE POLICY "Authenticated users can update their own notes"
  ON notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Authenticated users can update their own notes" ON notes IS 
  'Allows authenticated users to modify only their own notes';

-- DELETE policy for authenticated users
CREATE POLICY "Authenticated users can delete their own notes"
  ON notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Authenticated users can delete their own notes" ON notes IS 
  'Allows authenticated users to delete only their own notes';

-- =====================================================
-- Step 4: Restore RLS Policies for travel_plans table
-- =====================================================

-- DROP existing policies if any (idempotent)
DROP POLICY IF EXISTS "Authenticated users can view plans of their own notes" ON travel_plans;
DROP POLICY IF EXISTS "Authenticated users can create plans for their own notes" ON travel_plans;
DROP POLICY IF EXISTS "Authenticated users can update plans of their own notes" ON travel_plans;
DROP POLICY IF EXISTS "Authenticated users can delete plans of their own notes" ON travel_plans;

-- SELECT policy for authenticated users
CREATE POLICY "Authenticated users can view plans of their own notes"
  ON travel_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM notes 
      WHERE notes.id = travel_plans.note_id 
        AND notes.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Authenticated users can view plans of their own notes" ON travel_plans IS 
  'Allows authenticated users to read travel plans associated with their own notes';

-- INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create plans for their own notes"
  ON travel_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM notes 
      WHERE notes.id = travel_plans.note_id 
        AND notes.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Authenticated users can create plans for their own notes" ON travel_plans IS 
  'Allows authenticated users to create travel plans for their own notes only';

-- UPDATE policy for authenticated users
CREATE POLICY "Authenticated users can update plans of their own notes"
  ON travel_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM notes 
      WHERE notes.id = travel_plans.note_id 
        AND notes.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Authenticated users can update plans of their own notes" ON travel_plans IS 
  'Allows authenticated users to modify travel plans associated with their own notes';

-- DELETE policy for authenticated users
CREATE POLICY "Authenticated users can delete plans of their own notes"
  ON travel_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM notes 
      WHERE notes.id = travel_plans.note_id 
        AND notes.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Authenticated users can delete plans of their own notes" ON travel_plans IS 
  'Allows authenticated users to delete travel plans associated with their own notes';

-- =====================================================
-- Step 5: Verify delete_user_account() works with RLS
-- =====================================================

-- The delete_user_account() function uses SECURITY DEFINER which bypasses RLS
-- This ensures it can still delete from auth.users even with RLS enabled
-- No changes needed, but let's verify the function exists

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'delete_user_account'
  ) THEN
    RAISE EXCEPTION 'delete_user_account() function not found. Please apply migration 20251118000000_cleanup_zombie_accounts.sql first.';
  END IF;
  
  RAISE NOTICE '✅ delete_user_account() function verified';
END $$;

-- =====================================================
-- Migration Complete
-- 
-- What changed:
-- 1. RLS is now ENABLED on all tables (profiles, notes, travel_plans)
-- 2. All security policies have been restored from initial schema
-- 3. Users can now only access their own data
-- 4. delete_user_account() continues to work via SECURITY DEFINER
--
-- Post-Migration Checklist:
-- 1. Test user registration (verify trigger creates profiles)
-- 2. Test user login and profile access
-- 3. Test account deletion flow
-- 4. Test notes and travel_plans CRUD operations
-- 5. Verify users cannot access other users' data
--
-- Rollback (if needed):
-- If you need to rollback to dev mode with RLS disabled:
-- 1. Run: ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- 2. Run: ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
-- 3. Run: ALTER TABLE travel_plans DISABLE ROW LEVEL SECURITY;
-- 4. Drop all policies (see 20251017120001_disable_rls_policies.sql)
--
-- NEVER rollback RLS in production - fix issues instead!
-- =====================================================

