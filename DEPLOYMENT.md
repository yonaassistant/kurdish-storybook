# 🚀 Deployment Guide

## Vercel Deployment (Recommended)

### Option 1: GitHub + Vercel Dashboard

1. **Push to GitHub**:
```bash
# Create a new repository on GitHub (e.g., kurdish-storybook)
git remote add origin https://github.com/YOUR_USERNAME/kurdish-storybook.git
git branch -M main
git push -u origin main
```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Add environment variable:
     - `OPENAI_API_KEY` = your OpenAI API key
   - Click "Deploy"

### Option 2: Vercel CLI

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Login**:
```bash
vercel login
```

3. **Deploy**:
```bash
cd /data/.openclaw/workspace/kurdish-storybook
vercel
```

4. **Add environment variables** in Vercel dashboard:
   - Project Settings → Environment Variables
   - Add `OPENAI_API_KEY`

5. **Redeploy** (if needed):
```bash
vercel --prod
```

## Environment Variables

Required:
- `OPENAI_API_KEY` - Your OpenAI API key (get from platform.openai.com)

Optional (for future enhancements):
- `REPLICATE_API_TOKEN` - For AI character generation

## Post-Deployment

1. **Test the app**:
   - Visit your Vercel URL
   - Try creating a storybook
   - Verify PDF downloads correctly

2. **Custom Domain** (optional):
   - Vercel Dashboard → Domains
   - Add your custom domain (e.g., storybook.yonadev.com)

## Troubleshooting

**Build fails**:
- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility

**API errors in production**:
- Confirm environment variables are set in Vercel dashboard
- Check Vercel function logs for errors

**PDF generation timeout**:
- Vercel free tier has 10s function timeout
- Consider upgrading to Pro for 60s timeout if needed

---

Ready to deploy? Run `vercel` in the project directory! 🚀
