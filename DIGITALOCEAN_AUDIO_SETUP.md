# DIGITALOCEAN_AUDIO_SETUP

## Deploy the audio processor

```bash
# SSH to droplet
ssh root@<droplet-ip>

# Build from repo (audio-processor directory)
cd /path/to/alonetogether/audio-processor
docker build -t audio-processor .

# Stop old container (if exists)
docker rm -f audio-processor 2>/dev/null || true

# Run new container (listens on 8080, publish port 80)
# IMPORTANT: AUDIO_PROCESSOR_SECRET must match Vercel env; NODE_ENV=production
docker run -d \
  --name audio-processor \
  --restart=always \
  --memory=1g \
  --cpus=1 \
  -p 80:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  -e SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
  -e SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY" \
  -e AUDIO_PROCESSOR_SECRET="YOUR_SHARED_SECRET" \
  -e DIAG_SECRET_TOKEN="YOUR_DIAG_TOKEN" \
  audio-processor

# Verify
docker ps
curl -s http://localhost/health
```

Expected health (shape):
```json
{"status":"ok","service":"audio-processor","configured":true,"authConfigured":true,"busy":false}
```

## Firewall
```bash
ufw status
ufw allow OpenSSH
ufw allow 80/tcp
ufw enable
```
Also check DO Cloud Firewalls if attached. **Do not rely on IP secrecy** — `/process-audio` requires `AUDIO_PROCESSOR_SECRET` (Authorization: Bearer … or `x-processor-secret`).

## Diagnostics
- Health: `http://<droplet-ip>/health`
- Diag: `http://<droplet-ip>/diag` with header `x-diag-token: <DIAG_SECRET_TOKEN>` (required when `NODE_ENV=production`)
- Logs: `docker logs -n 200 audio-processor`

## Common errors
- Connection refused → wrong port mapping; ensure `-p 80:8080` and `PORT=8080`.
- configured:false → missing/incorrect Supabase envs; recreate container.
- authConfigured:false / 503 on process → set `AUDIO_PROCESSOR_SECRET` on droplet **and** Vercel.
- 401 from process-audio → secret mismatch between Vercel and droplet.
- 503 Processor busy → another mix is running (single-flight); retry shortly.
- FFmpeg failed → check logs; confirm `instrumental.mp3` exists in Supabase `assets` bucket.

See also: `GO_LIVE_HARDENING.md`
