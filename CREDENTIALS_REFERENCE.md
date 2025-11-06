# CREDENTIALS_REFERENCE

Keep this file private. Do not commit real secrets to public repos.

## Supabase
- Project URL: `https://sqrriiduxnbjcdpdbiyq.supabase.co`
- Publishable key (client): `sb_publishable_...`
- Secret key (server): `sb_secret_...`

## Vercel Environment Variables (App)
- `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase Publishable key
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase Secret key
- `AUDIO_PROCESSOR_URL` = `http://<droplet-ip>` (e.g. `http://165.22.122.171`)

## DigitalOcean Droplet (Processor)
- Environment variables (passed via `docker run`):
  - `SUPABASE_URL` = Supabase Project URL
  - `SUPABASE_SERVICE_ROLE_KEY` = Supabase Secret key
  - `PORT` = `8080` (container listens on 8080; host maps `-p 80:8080`)

## Local Development (.env.local)
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...`
- `SUPABASE_SERVICE_ROLE_KEY=sb_secret_...`
- `AUDIO_PROCESSOR_URL=http://<droplet-ip>`

## Rotation Guidance
- Rotate old keys in Supabase Settings → API (use new publishable/secret model).
- After rotation: update Droplet container, Vercel envs, and `.env.local`.

