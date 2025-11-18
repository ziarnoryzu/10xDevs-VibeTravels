# 🚀 Production Deployment Guide - VibeTravels

## 📋 Pre-Deployment Checklist

### Local Testing
- [ ] All migrations are in `supabase/migrations/` directory
- [ ] Account deletion flow works locally
- [ ] No zombie accounts exist locally
- [ ] All tests pass
- [ ] No linter errors

### Code Review
- [ ] Review all changes in `src/pages/api/profiles/me.ts`
- [ ] Review all changes in `src/components/hooks/useProfile.ts`
- [ ] Review temporary workaround in `src/pages/api/auth/register.ts`
- [ ] Ensure all environment variables are configured

## 🔧 Deployment Steps

### Step 1: Deploy to Supabase Cloud

```bash
# Make sure you're logged in to Supabase CLI
supabase login

# Link your project (if not already linked)
supabase link --project-ref <your-project-ref>

# Push migrations to production
supabase db push

# Verify migrations were applied
# Check in Supabase Dashboard → Database → Migrations
```

**Migrations that should be applied:**
1. `20251017120000_initial_schema.sql` - Initial tables
2. `20251017120001_disable_rls_policies.sql` - Disabled RLS (dev only)
3. `20251104120000_create_profile_trigger.sql` - Profile trigger
4. `20251104150000_fix_missing_profiles.sql` - Profile fixes
5. `20251112000000_fix_profile_trigger_duplicates.sql` - Trigger duplicate handling
6. `20251118000000_cleanup_zombie_accounts.sql` - **NEW**: Cleanup + delete function
7. `20251118120000_enable_rls_for_production.sql` - **NEW**: Enable RLS (apply later)

### Step 2: Verify Trigger Status

Run in Supabase SQL Editor:

```sql
-- Use the comprehensive check script
-- Copy contents from: supabase/scripts/check_trigger_status.sql
```

**Expected Results:**
- ✅ Trigger `on_auth_user_created` is ENABLED (tgenabled != 'O')
- ✅ Function `handle_new_user` exists with SECURITY DEFINER
- ✅ Recent users have profiles created within 5 seconds
- ✅ Zero zombie accounts

**If trigger is DISABLED:**

```sql
-- Enable the trigger
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- Verify it's enabled
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Step 3: Test Registration Flow

1. **Register a new test user:**
   - Use the registration form or API
   - Note the user's email

2. **Verify profile was created automatically:**

```sql
-- Check the most recent user
SELECT 
  au.id,
  au.email,
  au.created_at AS user_created_at,
  p.id AS profile_id,
  p.name,
  p.created_at AS profile_created_at,
  (p.created_at - au.created_at) AS time_diff
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC
LIMIT 5;
```

**Expected result:**
- Profile exists
- `time_diff` is less than 5 seconds
- Profile name matches the registration data

### Step 4: (Optional) Remove Manual Profile Creation

**Only do this if trigger is verified working in Step 3!**

1. **Follow the guide:**
   - See: `supabase/scripts/cleanup_manual_profile_creation.md`

2. **Remove lines 115-130 from `src/pages/api/auth/register.ts`:**

```typescript
// Remove this entire block:
// Step 5: Create profile for the new user
// Note: We create the profile manually because the trigger on auth.users is disabled in local dev
if (data.user) {
  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    name: name,
    preferences: {},
  });

  if (profileError) {
    // eslint-disable-next-line no-console
    console.error("Error creating profile:", profileError);
    // Profile creation failed, but user was created - they can still login
    // The profile will be attempted to be created by trigger or can be fixed later
  }
}
```

3. **Update step comment:**

```typescript
// Step 4: Handle registration error
if (error) {
  // ... error handling ...
}

// Step 5: Return success response (profile created by trigger)
return new Response(
  JSON.stringify({
    user: {
      id: data.user?.id,
      email: data.user?.email,
    },
  }),
  {
    status: 201,
    headers: { "Content-Type": "application/json" },
  }
);
```

4. **Deploy the updated code**
5. **Test registration again to confirm trigger works**

### Step 5: Enable RLS

**⚠️ CRITICAL: Only do this after verifying the trigger works!**

1. **Apply the RLS migration:**

```bash
# Option A: Via Supabase CLI
supabase db push

# Option B: Manually in SQL Editor
# Copy and run: supabase/migrations/20251118120000_enable_rls_for_production.sql
```

2. **Verify RLS is enabled:**

```sql
-- Check RLS status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'notes', 'travel_plans');

-- Should show rowsecurity = true for all tables
```

### Step 6: Comprehensive Testing

Test all functionality with RLS enabled:

#### Authentication & Profile
- [ ] ✅ Register new user
- [ ] ✅ Login with credentials
- [ ] ✅ GET `/api/profiles/me` returns own profile
- [ ] ✅ PUT `/api/profiles/me` updates own profile
- [ ] ✅ Cannot access other users' profiles
- [ ] ✅ DELETE `/api/profiles/me` deletes account properly
- [ ] ✅ After deletion, redirect to login page works

#### Notes (if implemented)
- [ ] ✅ Create note for own account
- [ ] ✅ Read own notes
- [ ] ✅ Update own notes
- [ ] ✅ Delete own notes
- [ ] ✅ Cannot access other users' notes

#### Travel Plans (if implemented)
- [ ] ✅ Create travel plan for own note
- [ ] ✅ Read own travel plans
- [ ] ✅ Update own travel plans
- [ ] ✅ Delete own travel plans
- [ ] ✅ Cannot access other users' travel plans

### Step 7: Cleanup & Monitoring

1. **Clean up any zombie accounts:**

```sql
SELECT public.cleanup_zombie_accounts();
-- Should return 0 if no zombie accounts exist
```

2. **Monitor for first 24 hours:**
   - Check Supabase Dashboard → Logs
   - Monitor for errors related to:
     - Profile creation
     - Account deletion
     - RLS policy violations
   - Check for new zombie accounts:

```sql
SELECT COUNT(*) 
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
-- Should return 0
```

3. **Set up alerts (optional):**
   - Create a cron job to check for zombie accounts daily
   - Alert if zombie accounts are found
   - Monitor authentication error rates

## 🚨 Troubleshooting

### Issue: Users can't register

**Symptoms:**
- Registration fails
- Profile not found errors after registration

**Diagnosis:**

```sql
-- Check trigger status
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check for zombie accounts
SELECT COUNT(*) FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

**Solution:**

```sql
-- If trigger is disabled, enable it
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- Clean up zombie accounts
SELECT public.cleanup_zombie_accounts();

-- Re-test registration
```

### Issue: Cannot delete account

**Symptoms:**
- DELETE request fails
- 500 error on account deletion

**Diagnosis:**

```sql
-- Check if delete_user_account function exists
SELECT proname FROM pg_proc WHERE proname = 'delete_user_account';

-- Check permissions
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'delete_user_account';
```

**Solution:**

```sql
-- Re-apply the cleanup migration
-- Run: supabase/migrations/20251118000000_cleanup_zombie_accounts.sql

-- Grant execute permission if missing
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;
```

### Issue: Users can access other users' data

**Symptoms:**
- Can see other users' notes/profiles
- RLS not working

**Diagnosis:**

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'notes', 'travel_plans');

-- Check if policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

**Solution:**

```sql
-- Re-apply RLS migration
-- Run: supabase/migrations/20251118120000_enable_rls_for_production.sql

-- Verify policies are active
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- Should return 14 policies (3 for profiles, 4 for notes, 4 for travel_plans, 3 for other)
```

### Issue: Zombie accounts appearing

**Symptoms:**
- Users exist in auth.users but not in profiles
- 410 Gone errors

**Diagnosis:**

```sql
-- Find zombie accounts
SELECT au.email, au.id, au.created_at 
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

**Solution:**

```sql
-- 1. Check trigger
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 2. Enable if disabled
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- 3. Clean up existing zombies
SELECT public.cleanup_zombie_accounts();

-- 4. Monitor for new zombies
-- Set up daily check
```

## 📚 Related Documentation

- `Naprawienie flow usuwania kont.md` - Overview of the account deletion fix
- `supabase/scripts/check_trigger_status.sql` - Trigger verification script
- `supabase/scripts/cleanup_manual_profile_creation.md` - Guide to remove workaround
- `supabase/migrations/20251118000000_cleanup_zombie_accounts.sql` - Cleanup migration
- `supabase/migrations/20251118120000_enable_rls_for_production.sql` - RLS migration

## 🔐 Security Notes

1. **Never disable RLS in production** - It's the first line of defense
2. **Always test with RLS enabled** before deploying
3. **Monitor for policy violations** in logs
4. **Use SECURITY DEFINER carefully** - Only for trusted functions
5. **Regularly audit database permissions** and policies

## ✅ Post-Deployment Verification

After completing all steps, verify:

- [ ] ✅ New users can register
- [ ] ✅ Profiles are created automatically by trigger
- [ ] ✅ Users can only access their own data
- [ ] ✅ Account deletion works completely
- [ ] ✅ No zombie accounts exist
- [ ] ✅ RLS is enabled on all tables
- [ ] ✅ All policies are active
- [ ] ✅ No errors in Supabase logs

**Congratulations! Your production deployment is complete! 🎉**

