-- Create the audio memories table in Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_url TEXT,  -- Made nullable since it's set after processing
  raw_recording_url TEXT,
  window_variant INTEGER DEFAULT floor(random() * 2 + 1),
  prompt_id INTEGER,
  location_city TEXT,
  location_country TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows service role to do everything
-- (This is needed for server-side operations)
CREATE POLICY "Service role can do everything"
ON public.memories
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Optional: Create an index on location for faster queries
CREATE INDEX IF NOT EXISTS idx_memories_location ON public.memories(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_memories_audio_url ON public.memories(audio_url) WHERE audio_url IS NOT NULL;

-- Skyline memories: text-only entries that feed the interactive skyline page
-- This is separate from the audio `memories` table above.
CREATE TABLE IF NOT EXISTS public.skyline_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  prompt TEXT,
  email TEXT,
  user_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.skyline_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything (skyline_memories)"
ON public.skyline_memories
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

