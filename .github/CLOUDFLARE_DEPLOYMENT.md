# Cloudflare Pages Deployment Guide

This document describes the setup and configuration for deploying the application to Cloudflare Pages using GitHub Actions.

## What Was Changed

### 1. Package Dependencies
- Added `@astrojs/cloudflare` adapter to support Cloudflare Pages deployment

### 2. Astro Configuration (`astro.config.mjs`)
- Updated to use Cloudflare adapter when `CF_PAGES` environment variable is present
- Falls back to Node.js adapter for local development
- Enables Cloudflare platform proxy for better local development experience

### 3. GitHub Actions Workflows

#### `master.yml` (NEW)
Automated deployment workflow that runs on every push to `master` branch:
- **Lint Code**: Runs ESLint to check code quality
- **Unit Tests**: Runs Vitest unit tests with coverage
- **Deploy**: Builds and deploys to Cloudflare Pages

#### `pull-request.yml` (UPDATED)
- Updated `actions/github-script` from v7 to v8 (latest major version)

## Required GitHub Secrets

Before the deployment workflow can run successfully, you need to configure the following secrets in your GitHub repository:

### Cloudflare Secrets
1. **`CLOUDFLARE_API_TOKEN`**
   - Create an API token in your Cloudflare dashboard
   - Go to: Profile → API Tokens → Create Token
   - Use "Edit Cloudflare Workers" template or create custom token with:
     - Account - Cloudflare Pages: Edit

2. **`CLOUDFLARE_ACCOUNT_ID`**
   - Find in: Cloudflare Dashboard → Pages → Your Project → Settings
   - Or in: Cloudflare Dashboard → Overview (right sidebar)

3. **`CLOUDFLARE_PROJECT_NAME`**
   - The name of your Cloudflare Pages project
   - Example: `vibe-travels` or `10x-project`

### Application Secrets (Required for Build AND Runtime)

⚠️ **CRITICAL**: These secrets must be set in BOTH GitHub Secrets AND Cloudflare Pages Environment Variables

4. **`SUPABASE_URL`** - Your Supabase project URL (required)
5. **`SUPABASE_ANON_KEY`** - Supabase anonymous key (required)
6. **`OPENROUTER_API_KEY`** - OpenRouter API key (⚠️ **REQUIRED** for AI travel plan generation - not optional!)

**Note**: `DEFAULT_USER_ID` is NOT needed in production - it's only used for local development to bypass authentication.

## Setting Up GitHub Secrets

⚠️ **IMPORTANT**: GitHub Secrets are used during the BUILD process. Make sure ALL required secrets are added:

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add each secret with its corresponding value:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_PROJECT_NAME`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `OPENROUTER_API_KEY` ⚠️ **REQUIRED - NOT OPTIONAL!**

## Cloudflare Pages Project Setup

### Option 1: Create Project via Cloudflare Dashboard
1. Go to Cloudflare Dashboard → Pages
2. Create a new project
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
   - **Node version**: `22.14.0` (or as specified in `.nvmrc`)

### Option 2: Use GitHub Actions (Recommended)
The `master.yml` workflow will automatically deploy your project using `wrangler-action`.
- First deployment will create the project automatically
- Subsequent pushes will update the existing deployment

## Environment Variables in Cloudflare Pages

⚠️ **CRITICAL**: After creating your Cloudflare Pages project, you MUST add environment variables for RUNTIME:

1. Go to: **Pages** → **Your Project** → **Settings** → **Environment variables**
2. Add the following variables for **Production** environment:
   - `SUPABASE_URL` (required)
   - `SUPABASE_ANON_KEY` (required)
   - `SUPABASE_SERVICE_ROLE_KEY` (required for admin API operations)
   - `OPENROUTER_API_KEY` ⚠️ **REQUIRED for AI travel plan generation - NOT OPTIONAL!**

3. **After adding/changing environment variables, you MUST click "Redeploy" or trigger a new deployment!**

**Important Notes**:
- Do NOT add `DEFAULT_USER_ID` in production - it's only for local development to bypass authentication
- `SUPABASE_SERVICE_ROLE_KEY` is NOT needed during build, but IS required at runtime for admin operations (API endpoints)
- `OPENROUTER_API_KEY` is needed in BOTH build-time (GitHub Secrets) and runtime (Cloudflare Pages Environment Variables)

## Why Environment Variables Need to Be in Both Places?

### Build-time (GitHub Secrets)
- Used by the workflow during `npm run build`
- Astro validates that all non-optional env vars are present during build
- If missing, build will fail

### Runtime (Cloudflare Pages Environment Variables)
- Used when your API endpoints are called in production
- If missing, API endpoints will return 500 errors
- Even if build succeeds without runtime vars, the app will crash when trying to use AI features

## How It Works

### Deployment Flow
1. Developer pushes code to `master` branch
2. GitHub Actions workflow triggers automatically
3. Code is linted and unit tested
4. If all checks pass, project is built with Cloudflare adapter
   - Build uses environment variables from GitHub Secrets
5. Built application is deployed to Cloudflare Pages using Wrangler
6. At runtime, Cloudflare Pages provides environment variables set in the dashboard
7. Deployment URL is provided in the workflow output

### Local Development
- Continue using `npm run dev` for local development
- The Node.js adapter will be used automatically (no `CF_PAGES` env var)
- No changes to your development workflow

### Preview Deployments
- You can configure Cloudflare Pages to create preview deployments for PRs
- This can be done in Cloudflare Dashboard → Pages → Settings → Builds & deployments

## Monitoring Deployments

### GitHub Actions
- View workflow runs: **Actions** tab in your repository
- Check deployment status and logs
- Download coverage artifacts

### Cloudflare Dashboard
- View deployment history: Pages → Your Project → Deployments
- Check deployment logs and analytics
- Monitor performance and errors

## Troubleshooting

### Build Fails with "Missing required environment variable: OPENROUTER_API_KEY"
- ✅ Verify `OPENROUTER_API_KEY` is set in GitHub Secrets (Settings → Secrets and variables → Actions)
- ✅ Check the secret name matches exactly: `OPENROUTER_API_KEY` (case-sensitive)
- ✅ Re-run the workflow after adding the secret

### API Endpoint Returns 500 Error (Travel Plan Generation Fails)
- ✅ Verify `OPENROUTER_API_KEY` is set in Cloudflare Pages Environment Variables
- ✅ Go to: Pages → Your Project → Settings → Environment variables
- ✅ Ensure it's set for the **Production** environment
- ✅ **After adding/changing, click "Redeploy" or push a new commit to trigger deployment**
- ✅ Check Cloudflare Pages logs (Functions tab) for detailed error messages

### Environment Variables Not Available
- Verify secrets are set in both GitHub and Cloudflare Dashboard
- Check secret names match exactly (case-sensitive)
- Ensure environment is set to "production" in Cloudflare
- **After changing variables in Cloudflare, you MUST redeploy!**

### Build Fails with "Module not found"
- Ensure all dependencies are in `package.json`
- Run `npm ci` locally to verify lockfile is correct
- Check Node.js version matches `.nvmrc` (22.14.0)

### Wrangler Authentication Error
- Verify `CLOUDFLARE_API_TOKEN` has correct permissions
- Check token is not expired
- Ensure `CLOUDFLARE_ACCOUNT_ID` is correct

## Verification Checklist

Before reporting issues, verify:
- [ ] `OPENROUTER_API_KEY` is in GitHub Secrets
- [ ] `OPENROUTER_API_KEY` is in Cloudflare Pages Environment Variables (Production)
- [ ] `SUPABASE_URL` is in both places
- [ ] `SUPABASE_ANON_KEY` is in both places
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is in Cloudflare Pages (not needed in GitHub Secrets)
- [ ] After adding/changing Cloudflare variables, you triggered a new deployment
- [ ] Build succeeds in GitHub Actions
- [ ] Application loads without errors
- [ ] Travel plan generation works (test by creating a note with 10+ words and generating a plan)

## Additional Resources

- [Astro Cloudflare Adapter Documentation](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler GitHub Action](https://github.com/cloudflare/wrangler-action)
