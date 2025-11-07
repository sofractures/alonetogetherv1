export interface Memory {
  id: string;
  audio_url: string;
  raw_recording_url?: string;
  window_variant: 1 | 2;
  prompt_id?: number;
  location_city?: string;
  location_country?: string;
  latitude?: number;
  longitude?: number;
  play_count: number;
  like_count: number;
  created_at: string;
}

export interface MemoryForMap {
  id: string;
  latitude: number;
  longitude: number;
  windowVariant: 1 | 2;
  location?: string;
  audioUrl: string;
}

