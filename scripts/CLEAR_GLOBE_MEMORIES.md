# Clear globe memories for public launch

Goal: empty the 3D globe so the first public visitors see a blank map, while **keeping all skyline text memories**.

## What this clears

| Data | Action |
|------|--------|
| `public.memories` (globe pins + songs) | **Delete all rows** |
| `public.skyline_memories` | **Leave alone** |
| Storage `memory-songs` / `processed-songs` | Optional cleanup in Dashboard |
| Storage `assets` | **Do not touch** |

## Steps

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql).
2. Open `scripts/clear-globe-memories.sql` from this repo.
3. Run **Step 1** (preview counts). Confirm skyline count looks right and globe count is what you expect to remove.
4. Uncomment `DELETE FROM public.memories;` in Step 2 and run it.
5. Reload the production Explore globe — it should show no windows.
6. Check `/skyline` — existing text buildings should still be there.
7. (Optional) Storage → empty `memory-songs` and `processed-songs` folders so old audio files are gone.

## Safety

- There is no `DELETE` on `skyline_memories` in this script.
- Prefer a Supabase backup / point-in-time recovery awareness before Step 2 if you might want test pins back.
