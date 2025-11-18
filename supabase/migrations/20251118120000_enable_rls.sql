-- =====================================================
-- Migration: Enable RLS
-- Created: 2025-11-18 12:00:00 UTC
-- Description: Enables Row Level Security and creates all security policies
-- 
-- This migration works in both development and production environments.
-- In development, you can bypass RLS by using service_role key.
-- 
-- Tables Affected:
--   - profiles: RLS enabled + policies created
--   - notes: RLS enabled + policies created
--   - travel_plans: RLS enabled + policies created
--
-- Prerequisites:
--   1. Verify trigger on_auth_user_created is enabled (see scripts/check_trigger_status.sql)
--   2. Ensure user deletion is handled via Supabase Admin API (not SQL function)
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
-- Migration Complete
-- 
-- What changed:
-- 1. RLS is now ENABLED on all tables (profiles, notes, travel_plans)
-- 2. All security policies have been created
-- 3. Users can now only access their own data
-- 4. Account deletion is handled via Supabase Admin API (bypasses RLS automatically)
--
-- Important Notes:
-- - In development, you can use service_role key to bypass RLS when needed
-- - Account deletion must use Admin API: supabaseAdmin.auth.admin.deleteUser()
-- - The Admin API automatically handles CASCADE deletion of profiles, notes, etc.
--
-- Post-Migration Testing:
-- 1. Test user registration (verify trigger creates profiles)
-- 2. Test user login and profile access
-- 3. Test account deletion flow via API endpoint
-- 4. Test notes and travel_plans CRUD operations
-- 5. Verify users cannot access other users' data
-- =====================================================

