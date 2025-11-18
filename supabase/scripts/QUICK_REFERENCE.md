# Quick Reference - Production Deployment

## 🚀 One-Page Command Reference

### Before Deployment

```bash
# Test locally
npm run dev

# Check for linter errors
npm run lint

# Verify migrations exist
ls -la supabase/migrations/
```

### Deploy to Supabase

```bash
# Login and link
supabase login
supabase link --project-ref <your-project-ref>

# Push migrations
supabase db push
```

### Verify Trigger (Run in SQL Editor)

```sql
-- Quick check
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- Result: tgenabled should NOT be 'O' (should be enabled)

-- If disabled, enable it
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- Check for zombie accounts
SELECT COUNT(*) FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
-- Result: Should be 0
```

### Enable RLS (Only after trigger verification!)

```bash
# Apply RLS migration
supabase db push
# This will apply: 20251118120000_enable_rls_for_production.sql

# OR run manually in SQL Editor
# Copy contents from: supabase/migrations/20251118120000_enable_rls_for_production.sql
```

### Verify RLS

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'notes', 'travel_plans');
-- Result: All should have rowsecurity = true

-- Check policies exist
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- Result: Should be 14+ policies
```

### Clean Up Zombie Accounts

```sql
-- Run cleanup
SELECT public.cleanup_zombie_accounts();
-- Result: Number of accounts deleted (should be 0 if everything is working)
```

### Test Account Deletion

```sql
-- Create test user first, then delete via UI
-- Verify user and all data is gone
SELECT * FROM auth.users WHERE email = 'test@example.com';
SELECT * FROM profiles WHERE id = '<test-user-id>';
-- Both should return 0 rows
```

## 🔍 Quick Diagnostics

### Problem: Registration fails

```sql
-- 1. Check trigger
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 2. Enable if needed
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- 3. Test registration again
```

### Problem: Can't delete account

```sql
-- 1. Check function exists
SELECT proname FROM pg_proc WHERE proname = 'delete_user_account';

-- 2. Check permissions
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'delete_user_account';

-- 3. Grant if missing
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;
```

### Problem: Users see other users' data

```sql
-- 1. Check RLS
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- 2. If disabled, re-run RLS migration
-- Run: 20251118120000_enable_rls_for_production.sql

-- 3. Verify policies
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

### Problem: Zombie accounts appearing

```sql
-- 1. Find them
SELECT au.email, au.id, au.created_at 
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 2. Check trigger
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 3. Clean up
SELECT public.cleanup_zombie_accounts();
```

## 📋 Deployment Order

1. ✅ Deploy code to Supabase Cloud
2. ✅ Run `check_trigger_status.sql`
3. ✅ Enable trigger if needed
4. ✅ Test registration
5. ✅ (Optional) Remove manual profile creation
6. ✅ Apply RLS migration
7. ✅ Test all functionality
8. ✅ Clean up zombie accounts
9. ✅ Monitor for 24h

## 🔗 Full Documentation

- **Comprehensive Guide**: `/DEPLOYMENT_GUIDE.md`
- **Overview**: `/Naprawienie flow usuwania kont.md`
- **Trigger Check**: `/supabase/scripts/check_trigger_status.sql`
- **Cleanup Guide**: `/supabase/scripts/cleanup_manual_profile_creation.md`

## ⚠️ Critical Warnings

1. **NEVER disable RLS in production**
2. **ALWAYS verify trigger before enabling RLS**
3. **ALWAYS test after each step**
4. **NEVER skip the verification steps**

## 🆘 Emergency Rollback

```sql
-- If something goes wrong with RLS

-- 1. Disable RLS (TEMPORARY - for emergency only!)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE travel_plans DISABLE ROW LEVEL SECURITY;

-- 2. Fix the issue
-- 3. Re-enable RLS as soon as possible!

-- NEVER leave RLS disabled in production!
```

## ✅ Success Checklist

- [ ] Trigger is enabled
- [ ] No zombie accounts
- [ ] RLS is enabled
- [ ] All policies are active
- [ ] Registration works
- [ ] Account deletion works
- [ ] Users can only see their own data
- [ ] No errors in logs

