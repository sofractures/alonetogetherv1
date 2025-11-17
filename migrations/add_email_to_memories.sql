-- Migration: Add email and user_name columns to memories table
-- This links each memory to the user who created it for download tracking

ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS user_name VARCHAR(255) NULL;

-- Add index on email for faster lookups (optional, but helpful for future email features)
CREATE INDEX IF NOT EXISTS idx_memories_email ON memories(email);

-- Add comment to document the purpose
COMMENT ON COLUMN memories.email IS 'Email address of the user who created this memory. Required for pinning to globe and receiving download link.';
COMMENT ON COLUMN memories.user_name IS 'Optional display name provided by the user when pinning their memory.';

