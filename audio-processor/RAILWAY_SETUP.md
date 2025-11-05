# Railway Setup Guide - Super Simple

## What You're Doing
Deploying a Node.js service to Railway that processes audio files with FFmpeg.

---

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (easiest)

---

## Step 2: Create New Project

1. In Railway dashboard, click "New Project"
2. Choose "Deploy from GitHub repo"
3. Select your repository (alonetogetherv1)
4. Railway will ask which folder - choose `audio-processor` folder

**OR** if you prefer to deploy manually:

1. Click "New Project"
2. Choose "Empty Project"
3. Click "Add Service" → "GitHub Repo"
4. Select your repo
5. Set Root Directory to: `audio-processor`

---

## Step 3: Add Environment Variables

In Railway dashboard, go to your service → Variables tab

Add these:
- `SUPABASE_URL` = `https://your-project.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = `your-service-role-key`

**To find your Supabase keys:**
1. Go to Supabase Dashboard → Your Project → Settings → API
2. Copy "Project URL" → That's `SUPABASE_URL`
3. Copy "service_role" key → That's `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 4: Deploy

Railway will automatically deploy when you:
- Push to GitHub, OR
- Click "Deploy" in Railway dashboard

**Wait for deployment** (usually 1-2 minutes)

---

## Step 5: Get Your Service URL

Once deployed:

1. Railway will show you a URL like: `https://your-service.railway.app`
2. **Copy this URL** - you'll need it for Vercel

---

## Step 6: Add URL to Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name:** `AUDIO_PROCESSOR_URL`
   - **Value:** `https://your-service.railway.app` (from Step 5)
   - **Environment:** Production, Preview, Development (select all)
3. **Save**
4. **Redeploy** your Vercel project

---

## Step 7: Test It!

1. Go to your deployed app
2. Record a test audio
3. Click "Accept & Upload"
4. Should see "Processing…" then playback modal

---

## Troubleshooting

### Service won't deploy
- Check that `package.json` exists in `audio-processor` folder
- Check Railway logs for errors

### "FFmpeg not found" error
- Railway needs FFmpeg installed
- Add to `railway.json` or use Railway's buildpack
- Or add a `Dockerfile` (we can help with this)

### Service URL not working
- Check Railway logs: Service → Deployments → Click deployment → View logs
- Make sure service is running (should show "Active")

### Environment variables not working
- Make sure you added them in Railway dashboard
- Redeploy after adding variables

---

## Quick Check

**Test your service directly:**
```bash
curl https://your-service.railway.app/health
```

Should return: `{"status":"ok","service":"audio-processor"}`

---

That's it! Much simpler than AWS Lambda 🎉

