-- Clear globe (audio) memories for public launch.
-- Leaves skyline_memories completely untouched.
--
-- Run in Supabase Dashboard → SQL Editor.
-- Recommended: run Step 1 first, confirm counts, then Step 2.

-- =============================================================================
-- Step 1: Preview (read-only)
-- =============================================================================
SELECT
  (SELECT COUNT(*) FROM public.memories) AS globe_memories_to_remove,
  (SELECT COUNT(*) FROM public.skyline_memories) AS skyline_memories_kept;

-- Optional: list what will be deleted
-- SELECT id, display_name, location_city, location_country, created_at, audio_url
-- FROM public.memories
-- ORDER BY created_at DESC;

-- =============================================================================
-- Step 2: Delete globe memory records only
-- =============================================================================
-- UNCOMMENT the line below after reviewing Step 1 counts:
-- DELETE FROM public.memories;

-- Verify after delete:
-- SELECT
--   (SELECT COUNT(*) FROM public.memories) AS globe_memories_remaining,
--   (SELECT COUNT(*) FROM public.skyline_memories) AS skyline_memories_kept;

-- =============================================================================
-- Optional: Storage cleanup (Dashboard → Storage, not SQL)
-- =============================================================================
-- After the table is empty, optionally empty these buckets so old audio is gone:
--   - memory-songs   (raw recordings)
--   - processed-songs (mixed songs)
-- Do NOT delete the `assets` bucket (instrumental / window textures).
-- Skyline has no audio files in storage.
