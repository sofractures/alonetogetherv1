# Memory Creation & Display Flow Analysis

## Current Flow (As Implemented)

1. ✅ **User Records Audio** → `AudioRecorder` component captures WebM audio
2. ✅ **Location Fetch** → `getBrowserLocation()` or `getIPLocation()` gets lat/lng
3. ✅ **Upload Recording** → `/api/memory/record` receives:
   - Audio file (FormData)
   - Location data (JSON string in FormData)
4. ✅ **Create Memory Record** → Database insert with:
   - `raw_recording_url` (path to raw recording)
   - `latitude`, `longitude` (if location available)
   - `location_city`, `location_country` (if available)
   - `window_variant` (random 1 or 2)
5. ✅ **Process Audio** → `/api/process-audio` → Audio processor service:
   - Processes audio with FFmpeg
   - Uploads to `processed-songs/final/{uuid}.mp3`
   - **Updates memory record** with `audio_url = processedPath`
6. ✅ **Playback Works** → Signed URL created, audio plays in "Your song is ready" popup
7. ❌ **Display on Globe** → `/api/memories/map` query fails with 500 error

## What We Know Works

- ✅ Supabase credentials are correct (playback works)
- ✅ Memory record is created (we have `memoryId`)
- ✅ `audio_url` is set correctly (playback works)
- ✅ File exists in bucket (can play directly from bucket)
- ✅ Location data is being sent from frontend

## Potential Issues

### Issue 1: Location Data Not Saved
**Symptom**: Memory record created but `latitude`/`longitude` are NULL
**Check**: Look at database records - do they have location data?
**Fix**: Verify location parsing in `/api/memory/record/route.ts` line 36

### Issue 2: Query Syntax Error
**Symptom**: 500 error when fetching memories
**Check**: Error details in debug panel should show Supabase error code
**Fix**: Simplified query to fetch all and filter in JavaScript

### Issue 3: Missing Step - Location Permission
**PRD Step 7**: "Save & Share → Download option and location permission request"
**Current**: Location is fetched automatically, but user might deny permission
**Impact**: If location denied and IP fallback fails, memory has no location → filtered out

### Issue 4: Timing Issue
**Symptom**: Memory created but not visible immediately
**Current**: Multiple `fetchMemories()` calls with delays (1s, 3s, 5s)
**Issue**: If `audio_url` update happens after all retries, memory won't appear
**Fix**: Need to verify `audio_url` is updated synchronously in audio processor

## Next Steps to Debug

1. **Check Debug Panel** → Look for detailed error message from API
2. **Check Database** → Verify memory records have:
   - `audio_url` set (should be path like `final/{uuid}.mp3`)
   - `latitude` and `longitude` set (not NULL)
3. **Check Logs** → Server logs should show:
   - How many memories fetched
   - Which ones filtered out and why
4. **Test Location Flow** → Verify location is actually being saved:
   - Check browser console for location data
   - Check database after creating a memory

## Missing Implementation (From PRD)

- **Step 7**: Explicit location permission request UI (currently automatic)
- **Step 8**: Visual feedback when window appears on globe (currently just refresh)

## Database Schema Check

The schema shows:
```sql
audio_url TEXT NOT NULL,  -- This is required!
latitude DECIMAL,         -- Optional
longitude DECIMAL,        -- Optional
```

**Issue**: If `audio_url` is NOT NULL constraint, but we're creating records BEFORE processing, this could fail!
**Check**: Is `audio_url` nullable in actual database? Or do we need to make it nullable?

