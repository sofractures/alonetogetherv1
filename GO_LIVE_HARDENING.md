# Go-live hardening checklist

Code on branch `security/go-live-hardening` hardens the app. **You still need to apply droplet + Supabase + Vercel env steps** below before production is locked down.

## 1. Shared secret (required)

Generate a long random secret (e.g. `openssl rand -hex 32`).

### Vercel
Add environment variable (Production + Preview):
- `AUDIO_PROCESSOR_SECRET` = `<same secret>`

Keep existing:
- `AUDIO_PROCESSOR_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- etc.

### Droplet (rebuild/restart container)
Pass the **same** secret plus production flags:

```bash
docker rm -f audio-processor 2>/dev/null || true

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
```

Rebuild the image from the updated `audio-processor/` code first (`docker build -t audio-processor .`).

**Verify:**
```bash
# Should be 401 without secret
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1/process-audio \
  -H 'Content-Type: application/json' -d '{"inputPath":"recordings/x.webm"}'

# Health should show authConfigured:true
curl -s http://127.0.0.1/health
```

## 2. Firewall (recommended)

On the droplet, prefer DO Cloud Firewall or ufw that:
- Allows **22** (SSH) from your IP
- Allows **80** from the internet *or* only known callers (Vercel egress IPs change — shared secret is the reliable lock)

Shared secret alone is the minimum; firewall is defence in depth.

## 3. Supabase storage (confirm in dashboard)

| Bucket | Recommended |
|--------|-------------|
| `memory-songs` | **Private** (raw voice) |
| `processed-songs` | Prefer **Private** + signed URLs only (app already uses signed URLs). If currently public, set private and re-test playback/download. |
| `assets` | Public OK (instrumental) |

Storage → bucket → Configuration → Public bucket toggle.

## 4. What the code now does

- Bearer / `x-processor-secret` required on droplet `/process-audio` (fail closed in production if unset)
- One FFmpeg job at a time (503 when busy)
- Paths limited to `recordings/*`
- Rate limits on map / audio / update
- Atomic email claim (`UPDATE … WHERE email IS NULL`)
- `maxDuration` 300s + 290s fetch abort on process-audio
- Privacy section on `/about`

## 5. Smoke test after deploy

1. Create a memory end-to-end (record → process → pin).
2. Play from globe.
3. Confirm unauthenticated `POST http://<droplet>/process-audio` returns **401**.
4. Confirm `/about` Privacy section reads correctly.
