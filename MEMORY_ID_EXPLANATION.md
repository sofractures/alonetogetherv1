# What is `memoryId`?

## `memoryId` is the Database Record ID

`memoryId` is **NOT**:
- ❌ The geolocation (latitude/longitude)
- ❌ The processed song file
- ❌ The audio file path

`memoryId` **IS**:
- ✅ The UUID (unique ID) of the database record in the `memories` table
- ✅ The link that connects everything together

## The Complete Flow

1. **User Records Audio** → File uploaded to `memory-songs` bucket ✅
2. **Create Database Record** → Insert into `memories` table with:
   - `id` (UUID) ← This is the `memoryId`
   - `raw_recording_url` (path to raw file)
   - `latitude`, `longitude` (location)
   - `location_city`, `location_country`
   - `window_variant`
   - `audio_url` (NULL initially) ← Will be set after processing
   
   **THIS STEP IS FAILING** → `memoryId = null` means the insert failed

3. **Process Audio** → File uploaded to `processed-songs` bucket ✅
   - The file exists and can be played
   - But there's no database record to update!

4. **Update Database Record** → Set `audio_url` to processed file path
   - **CAN'T UPDATE** because `memoryId = null` (record doesn't exist)

5. **Fetch Memories for Globe** → Query `memories` table
   - **NO RECORDS FOUND** because they were never created
   - Even though the processed files exist in the bucket!

## Why This Matters

The processed song file exists in the bucket, but:
- ❌ No database record links it to a location
- ❌ No database record stores the `audio_url`
- ❌ The globe query finds no records (because none exist)
- ❌ The window can't appear on the globe (no location data in database)

## The Problem

The database insert is failing silently. The error is being caught and logged, but the request continues. We need to see the actual error to fix it.

## What We Need to Check

1. **Why is the insert failing?**
   - Check server logs for: `[v0] API: Error creating memory record:`
   - Look for error code, message, details, hint

2. **Possible causes:**
   - Database constraint violation (e.g., `audio_url NOT NULL` but we're not providing it)
   - Missing required fields
   - Database connection issue
   - Table doesn't exist or has wrong schema

