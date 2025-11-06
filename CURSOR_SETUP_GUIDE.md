# CURSOR_SETUP_GUIDE

## Reset context
- Start a new Cursor chat/session.
- Say: “Use only DigitalOcean docs. Ignore AWS/Railway/Cloudinary.”
- Provide these docs:
  - `CURSOR_SETUP_GUIDE.md`
  - `DIGITALOCEAN_AUDIO_SETUP.md`
  - `CREDENTIALS_REFERENCE.md`

## Project context for prompts
```
Frontend: Next.js on Vercel
DB/Storage: Supabase
Processing: DigitalOcean Droplet + Docker + FFmpeg
Flow: Record → Upload → POST /api/process-audio → Processor → processed-songs
```

## Good prompt example
```
Set AUDIO_PROCESSOR_URL and test the end-to-end flow using DIGITALOCEAN_AUDIO_SETUP.md.
```

## Bad prompt example
```
Fix processing (without context).
```

