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

### Application Secrets
These are already required for your application to function:

4. **`SUPABASE_URL`** - Your Supabase project URL
5. **`SUPABASE_ANON_KEY`** - Supabase anonymous key (public)
6. **`SUPABASE_SERVICE_ROLE_KEY`** - Supabase service role key (private)
7. **`OPENROUTER_API_KEY`** - OpenRouter API key for AI features

**Note**: `DEFAULT_USER_ID` is NOT needed in production - it's only used for local development to bypass authentication.

## Setting Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add each secret with its corresponding value

## GitHub Environment Configuration

The workflow uses a `production` environment. You may want to configure protection rules:

1. Go to: **Settings** → **Environments** → **production**
2. (Optional) Add protection rules:
   - Required reviewers
   - Wait timer
   - Deployment branches (limit to `master`)

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

After creating your Cloudflare Pages project, add the following environment variables in the Cloudflare Dashboard:

1. Go to: **Pages** → **Your Project** → **Settings** → **Environment variables**
2. Add the following variables for **Production** environment:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENROUTER_API_KEY`

**Important**: Do NOT add `DEFAULT_USER_ID` in production - it's only for local development to bypass authentication. Production should use real Supabase authentication.

## How It Works

### Deployment Flow
1. Developer pushes code to `master` branch
2. GitHub Actions workflow triggers automatically
3. Code is linted and unit tested
4. If all checks pass, project is built with Cloudflare adapter
5. Built application is deployed to Cloudflare Pages using Wrangler
6. Deployment URL is provided in the workflow output

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

### Build Fails with "Module not found"
- Ensure all dependencies are in `package.json`
- Run `npm ci` locally to verify lockfile is correct
- Check Node.js version matches `.nvmrc` (22.14.0)

### Environment Variables Not Available
- Verify secrets are set in both GitHub and Cloudflare Dashboard
- Check secret names match exactly (case-sensitive)
- Ensure environment is set to "production" in Cloudflare

### Wrangler Authentication Error
- Verify `CLOUDFLARE_API_TOKEN` has correct permissions
- Check token is not expired
- Ensure `CLOUDFLARE_ACCOUNT_ID` is correct

## Additional Resources

- [Astro Cloudflare Adapter Documentation](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler GitHub Action](https://github.com/cloudflare/wrangler-action)

