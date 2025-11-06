# AUDIO_PROCESSING_ARCHITECTURE

## Overview
- Frontend: Next.js (Vercel)
- DB/Storage: Supabase
- Processor: DigitalOcean Droplet running Node.js + FFmpeg in Docker

## Flow
1) User records (WebM) in browser
2) `/api/memory/record` uploads to Supabase `memory-songs`
3) `/api/process-audio` calls `AUDIO_PROCESSOR_URL/process-audio`
4) Processor downloads voice + `assets/instrumental.mp3` from Supabase
5) FFmpeg: high-pass → compression → reverb → volume → mix with instrumental
6) Upload MP3 (320kbps) to `processed-songs/final/...`
7) API returns signed URL for playback

## Env contracts
- App (Vercel): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUDIO_PROCESSOR_URL`
- Processor (Droplet): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT=8080`

## Health & Diagnostics
- `GET /health` → `configured:true`
- `GET /diag` → confirms env presence (no secrets)

