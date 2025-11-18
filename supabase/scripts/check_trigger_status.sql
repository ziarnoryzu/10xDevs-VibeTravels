-- =====================================================
-- Script: Check Trigger Status in Production
-- Purpose: Verify if on_auth_user_created trigger is enabled
-- Usage: Run this in Supabase SQL Editor after deployment
-- =====================================================

-- =====================================================
-- Check 1: Trigger existence and status
-- =====================================================
SELECT 
  tgname AS trigger_name,
  tgenabled AS status,
  CASE 
    WHEN tgenabled = 'O' THEN '❌ DISABLED'
    WHEN tgenabled = 'D' THEN '❌ DISABLED (session)'
    WHEN tgenabled = 'R' THEN '❌ DISABLED (replica)'
    WHEN tgenabled = 'A' THEN '❌ DISABLED (always)'
    ELSE '✅ ENABLED'
  END AS status_description,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- =====================================================
-- Check 2: Verify handle_new_user function exists
-- =====================================================
SELECT 
  proname AS function_name,
  prosecdef AS is_security_definer,
  CASE WHEN prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ NOT SECURITY DEFINER' END AS security_status
FROM pg_proc
WHERE proname = 'handle_new_user';

-- =====================================================
-- Check 3: Test trigger by checking recent user registrations
-- =====================================================
-- This query shows if profiles are being created for new users
SELECT 
  au.id,
  au.email,
  au.created_at AS user_created_at,
  p.id AS profile_id,
  p.created_at AS profile_created_at,
  CASE 
    WHEN p.id IS NULL THEN '❌ MISSING PROFILE (zombie account)'
    WHEN p.created_at - au.created_at < interval '5 seconds' THEN '✅ TRIGGER WORKING'
    ELSE '⚠️  PROFILE CREATED LATE (may be manual)'
  END AS status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.created_at > NOW() - INTERVAL '7 days'
ORDER BY au.created_at DESC
LIMIT 20;

-- =====================================================
-- Check 4: Count zombie accounts
-- =====================================================
SELECT 
  COUNT(*) AS zombie_account_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No zombie accounts'
    ELSE '⚠️  Zombie accounts exist - trigger may not be working'
  END AS status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- =====================================================
-- INTERPRETATION GUIDE
-- =====================================================
-- 
-- Check 1: Trigger Status
--   - If tgenabled != 'O', the trigger is ENABLED
--   - If tgenabled = 'O', the trigger is DISABLED (local dev scenario)
--
-- Check 2: Function Verification
--   - Function should exist with is_security_definer = true
--
-- Check 3: Recent Registrations
--   - If profiles are created within 5 seconds of user creation, trigger is working
--   - If profiles are missing or created late, trigger may not be working
--
-- Check 4: Zombie Accounts
--   - Zero zombie accounts = trigger has been working consistently
--   - Non-zero zombie accounts = trigger is not working or was disabled previously
--
-- =====================================================
-- ACTION REQUIRED
-- =====================================================
--
-- IF TRIGGER IS ENABLED (tgenabled != 'O'):
--   1. Remove manual profile creation from /api/auth/register (lines 115-130)
--   2. Deploy the updated register endpoint
--
-- IF TRIGGER IS DISABLED (tgenabled = 'O'):
--   1. Enable the trigger:
--      ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
--   2. Re-run this script to verify
--   3. If enabled successfully, remove manual profile creation
--
-- IF ZOMBIE ACCOUNTS EXIST:
--   1. Clean them up:
--      SELECT public.cleanup_zombie_accounts();
--   2. Investigate why trigger wasn't working
--
-- =====================================================

