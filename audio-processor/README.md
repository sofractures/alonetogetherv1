# Audio Processor Service

Node.js service that processes audio files using FFmpeg. Deployed on DigitalOcean Droplet with Docker.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (legacy JWT format)
- `PORT` - Server port (default: 8080, mapped to host port 80)

## Deploy to DigitalOcean Droplet

See `DIGITALOCEAN_AUDIO_SETUP.md` in the project root for detailed deployment instructions.

Quick steps:
1. Create a DigitalOcean Droplet (Ubuntu)
2. SSH into the droplet
3. Install Docker
4. Clone the repository
5. Build Docker image: `docker build -t audio-processor .`
6. Run container with environment variables:
```bash
docker run -d \
  --name audio-processor \
  --restart=always \
  -p 80:8080 \
  -e PORT=8080 \
  -e SUPABASE_URL="your-url" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-key" \
  audio-processor
```

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

