# GitHub Pages Deployment Guide for tryed

## CRITICAL: Supabase Domain Configuration

**⚠️ MUST DO FIRST:** Before deployment works, configure Supabase:

1. **Go to Supabase Dashboard** → Your Project → **Settings** → **API**
2. **Site URL**: Change from localhost to: `https://gerbriel.github.io`
3. **Additional redirect URLs**: Add these **exact URLs**:
   ```
   https://gerbriel.github.io/Project-managment-app
   https://gerbriel.github.io/Project-managment-app/
   https://gerbriel.github.io/Project-managment-app/**
   ```

4. **Go to Authentication** → **URL Configuration**
5. **Redirect URLs**: Add:
   ```
   https://gerbriel.github.io/Project-managment-app/**
   ```

## GitHub Repository Configuration

1. Go to your GitHub repository: `https://github.com/gerbriel/Project-managment-app`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** and add:

   **Secret 1:**
   - Name: `VITE_SUPABASE_URL`
   - Secret: `https://lvplhlzzwtrqjdxhjrkd.supabase.co` (your actual URL)

   **Secret 2:**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Secret: Your Supabase anon key (starts with `eyJ...`)

### 3. Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. **Source**: "GitHub Actions"
3. The workflow will create the `gh-pages` branch automatically

## Current Issues and Solutions

### Issue 1: Asset Loading (404 errors)
The current error `GET https://gerbriel.github.io/src/main.tsx 404` indicates assets aren't loading correctly.

**Solution Applied:**
- Fixed Vite base configuration to use proper mode detection
- Updated asset paths to be relative
- Improved build configuration

### Issue 2: Host Validation Failed
Supabase rejects requests from GitHub Pages domain.

**Solution Required:**
1. **MUST UPDATE** Supabase Site URL to: `https://gerbriel.github.io`
2. **MUST ADD** GitHub Pages domain to allowed URLs
3. Ensure environment variables are set in GitHub Secrets

## Testing the Fix

After making these changes, the deployment should work. You can test by:

1. **Check if secrets are set:** Go to repository Settings → Secrets and verify both secrets exist
2. **Trigger new deployment:** Push any change to main branch or manually re-run the GitHub Action
3. **Monitor the build:** Check the Actions tab for any build errors
4. **Verify the site:** Visit `https://gerbriel.github.io/Project-managment-app/`

## Immediate Action Required

**You must complete Step 1 (Supabase Configuration) for the site to work!**

The host validation errors will persist until you:
1. Change your Supabase Site URL to `https://gerbriel.github.io`
2. Add the GitHub Pages URLs to your allowed URLs list

## Troubleshooting

### If you still get 404 errors:
- Check if GitHub Actions workflow completed successfully
- Verify the `dist` folder was created and uploaded
- Ensure GitHub Pages is set to use GitHub Actions

### If you still get host validation errors:
- Double-check Supabase Site URL configuration
- Verify GitHub Secrets are set correctly
- Check browser console for specific error messages

### If the build fails:
- Check GitHub Actions logs for specific errors
- Verify Node.js version compatibility
- Ensure all dependencies are properly installed