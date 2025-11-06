# Audio Processor Service

Node.js service that processes audio files using FFmpeg. Deployed on Railway.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `PORT` - Server port (default: 3001)

## Deploy to Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Link to project: `railway link`
5. Set environment variables in Railway dashboard
6. Deploy: `railway up`

Or use the Railway dashboard:
1. Go to railway.app
2. Create new project
3. Connect GitHub repo (or deploy from folder)
4. Select this folder
5. Add environment variables
6. Deploy

## Endpoints

- `POST /process-audio` - Process audio file
  - Body: `{ inputPath, instrumentalPath, memoryId }`
  - Returns: `{ processedPath, signedUrl, success }`
- `GET /health` - Health check

## FFmpeg Processing

Applies the exact filter chain:
- High-pass filter (80Hz)
- Compression (3:1 ratio)
- Normalize (-6dB)
- Reverb (25% wet)
- Mix with instrumental
- Output: 320kbps MP3, 44.1kHz, stereo

