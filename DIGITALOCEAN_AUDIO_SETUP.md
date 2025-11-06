# DIGITALOCEAN_AUDIO_SETUP

## Deploy the audio processor

```bash
# SSH to droplet
ssh root@<droplet-ip>

# Stop old container (if exists)
docker rm -f audio-processor 2>/dev/null || true

# Run new container (listens on 8080, publish port 80)
docker run -d \
  --name audio-processor \
  --restart=always \
  -p 80:8080 \
  -e PORT=8080 \
  -e SUPABASE_URL="https://sqrriiduxnbjcdpdbiyq.supabase.co" \
  -e SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." \
  audio-processor

# Verify
docker ps
curl -s http://localhost/health
```

Expected:
```json
{"status":"ok","service":"audio-processor","configured":true}
```

## Firewall
```bash
ufw status
ufw allow 80/tcp
```
Also check DO Cloud Firewalls if attached.

## Diagnostics
- Health: `http://<droplet-ip>/health`
- Diag: `http://<droplet-ip>/diag`
- Logs: `docker logs -n 200 audio-processor`

## Common errors
- Connection refused → wrong port mapping; ensure `-p 80:8080` and `PORT=8080`.
- configured:false → missing/incorrect envs; recreate with correct `sb_secret_...`.
- FFmpeg failed → check logs; confirm `instrumental.mp3` exists in Supabase `assets` bucket.

