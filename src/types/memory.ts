export interface Memory {
  id: string;
  audio_url: string;
  raw_recording_url?: string;
  window_variant: 1 | 2;
  display_name?: string;
  prompt_id?: number;
  location_city?: string;
  location_country?: string;
  latitude?: number;
  longitude?: number;
  play_count: number;
  like_count: number;
  created_at: string;
  email?: string; // Email of memory creator
  user_name?: string; // User's display name
}

export interface MemoryForMap {
  id: string;
  latitude: number;
  longitude: number;
  windowVariant: 1 | 2;
  location?: string;
  audioUrl: string;
  name?: string;
  createdAt?: string; // ISO timestamp for sorting by creation time
  email?: string; // Email of memory creator (for download permission check)
}

