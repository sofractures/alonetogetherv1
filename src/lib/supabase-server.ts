import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (server env)');
}

// Basic sanity check to avoid "Invalid Compact JWS" due to malformed keys
const jwtLike = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/;
if (!jwtLike.test(SUPABASE_SERVICE_ROLE_KEY.trim())) {
  throw new Error('Invalid SUPABASE_SERVICE_ROLE_KEY format. Ensure you copied the Service Role key exactly (no quotes or spaces) and it matches the project URL.');
}

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.trim(), {
  auth: { autoRefreshToken: false, persistSession: false },
});


