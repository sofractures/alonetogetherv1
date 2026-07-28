# Audio Processor Service

Node.js service that processes audio files using FFmpeg. Deployed on DigitalOcean Droplet with Docker.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `AUDIO_PROCESSOR_SECRET` - Shared secret with the Next.js app (required in production)
- `DIAG_SECRET_TOKEN` - Token for `/diag` when `NODE_ENV=production`
- `NODE_ENV` - Use `production` on the droplet
- `PORT` - Server port (default: 8080, mapped to host port 80)

## Deploy to DigitalOcean Droplet

See `DIGITALOCEAN_AUDIO_SETUP.md` and `GO_LIVE_HARDENING.md` in the project root.

Quick run (after `docker build -t audio-processor .`):
```bash
docker run -d \
  --name audio-processor \
  --restart=always \
  --memory=1g \
  --cpus=1 \
  -p 80:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  -e SUPABASE_URL="your-url" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-key" \
  -e AUDIO_PROCESSOR_SECRET="your-shared-secret" \
  -e DIAG_SECRET_TOKEN="your-diag-token" \
  audio-processor
```

## Endpoints

- `POST /process-audio` - Process audio file (**requires** `Authorization: Bearer <AUDIO_PROCESSOR_SECRET>` or `x-processor-secret`)
  - Body: `{ inputPath, instrumentalPath, memoryId }`
  - `inputPath` must match `recordings/{id}.webm` (etc.)
  - Returns 503 if another job is already running (single-flight)
- `GET /health` - Health check (`authConfigured`, `busy`)
- `GET /diag` - Minimal diagnostics (token required in production)

## FFmpeg Processing

Applies the exact filter chain:
- High-pass filter (80Hz)
- Compression (3:1 ratio)
- Normalize (-6dB)
- Reverb (25% wet)
- Mix with instrumental
- Output: 320kbps MP3, 44.1kHz, stereo

