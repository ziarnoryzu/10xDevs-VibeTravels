# Deployment Guide

## ⚠️ Important: GitHub Pages Not Supported

This project uses **Server-Side Rendering (SSR)** with Astro, which requires a Node.js runtime. GitHub Pages only supports static files and **cannot run SSR applications**.

## Recommended Deployment Platforms

Deploy this application to one of these platforms that support SSR:

### 1. Vercel (Recommended) ⭐

**Why Vercel:**
- Free tier with generous limits
- Automatic deployments from GitHub
- Built-in support for Astro SSR
- Environment variables management

**Steps:**
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Import your repository
4. Add environment variables in project settings:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DEFAULT_USER_ID`
   - `OPENROUTER_API_KEY` (optional)
5. Deploy!

### 2. Netlify

**Steps:**
1. Go to [netlify.com](https://netlify.com)
2. Sign in with GitHub
3. Import your repository
4. Add environment variables in site settings
5. Deploy!

### 3. Cloudflare Pages

**Steps:**
1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect your GitHub repository
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variables
6. Deploy & enjoy!

## Environment Variables

Required environment variables for deployment:

```bash
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Default User (for development)
DEFAULT_USER_ID=your-default-user-id

# OpenRouter API (optional)
OPENROUTER_API_KEY=your-openrouter-api-key
```

## Current CI/CD Setup

- **Pull Request CI** (`.github/workflows/pull-request.yml`):
  - Runs linting
  - Runs unit tests
  - Runs E2E tests
  
- **Build Test** (`.github/workflows/pages.yml`):
  - Tests production build on push to master
  - Does NOT deploy (GitHub Pages doesn't support SSR)

## Local Development

```bash
npm install
npm run dev
```

## Build Locally

```bash
npm run build
npm run preview
```
