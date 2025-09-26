# GitHub Pages Deployment Guide for SouthElm

## Pre-deployment Setup

### 1. Configure Supabase for GitHub Pages

In your Supabase dashboard:

1. Go to **Settings** → **API**
2. Under **Site URL**, add your GitHub Pages URL:
   ```
   https://gerbriel.github.io/Project-managment-app
   ```
3. Under **Additional URLs**, also add:
   ```
   https://gerbriel.github.io
   ```
4. Go to **Authentication** → **URL Configuration**
5. Add your GitHub Pages URL to the **Redirect URLs**:
   ```
   https://gerbriel.github.io/Project-managment-app/**
   ```

### 2. Set Up Environment Variables

For production deployment, you have several options:

#### Option A: Use GitHub Secrets (Recommended)
1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

#### Option B: Create .env.production file
1. Copy `.env.production.example` to `.env.production`
2. Fill in your production values
3. **⚠️ WARNING**: Do NOT commit this file with real credentials

### 3. Enable GitHub Pages

1. Go to your repository → Settings → Pages
2. Select **Source**: Deploy from a branch
3. Select **Branch**: `gh-pages` (this will be created automatically)
4. Select **Folder**: `/` (root)
5. Click **Save**

## Deployment Process

### Automatic Deployment (Recommended)

The GitHub Actions workflow will automatically deploy when you push to main:

```bash
git add .
git commit -m "fix: configure for GitHub Pages deployment"
git push origin main
```

### Manual Deployment

If you prefer to deploy manually:

```bash
# Build for production
npm run build

# Deploy to gh-pages branch (install gh-pages if needed)
npm install -g gh-pages
gh-pages -d dist
```

## Troubleshooting

### 404 Errors
- Make sure the `base` path in `vite.config.ts` matches your repository name
- Ensure GitHub Pages is enabled and pointing to the correct branch

### Host Validation Failed
- Add your GitHub Pages URL to Supabase Site URL settings
- Check that environment variables are properly set

### Routing Issues
- The app includes spa-github-pages scripts to handle client-side routing
- Make sure the `404.html` file is present in the `public` directory

### Environment Variables Not Loading
- Verify variables are prefixed with `VITE_`
- Check GitHub Secrets are properly named and accessible
- Ensure production environment file exists (if using Option B)

## Testing the Deployment

After deployment, your app should be available at:
```
https://gerbriel.github.io/Project-managment-app/
```

Check the browser console for any errors and verify:
1. The app loads without 404 errors
2. Supabase connection works (no "Host validation failed" errors)
3. Routing works when navigating between pages
4. Environment variables are loaded correctly

## Security Notes

- Never commit real Supabase credentials to the repository
- Use GitHub Secrets for sensitive environment variables
- Regularly rotate API keys and credentials
- Monitor Supabase usage and access logs