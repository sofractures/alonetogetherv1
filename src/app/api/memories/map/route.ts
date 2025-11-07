import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { Memory, MemoryForMap } from '@/types/memory';

export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('[v0] API: Starting memory fetch...');
    
    // Check if Supabase client is initialized
    if (!supabaseServer) {
      console.error('[v0] API: Supabase client not initialized');
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Fetch all memories with location data and processed audio
    const { data: memories, error } = await supabaseServer
      .from('memories')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('audio_url', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[v0] API: Supabase query error:', error);
      console.error('[v0] API: Error code:', error.code);
      console.error('[v0] API: Error message:', error.message);
      console.error('[v0] API: Error details:', error.details);
      console.error('[v0] API: Error hint:', error.hint);
      return NextResponse.json(
        { error: 'Failed to fetch memories', details: error.message, code: error.code },
        { status: 500 }
      );
    }
    
    console.log('[v0] API: Fetched', memories?.length || 0, 'memories from database');
    if (memories && memories.length > 0) {
      console.log('[v0] API: Memory details:', memories.map((m: Memory) => ({
        id: m.id,
        audio_url: m.audio_url,
        latitude: m.latitude,
        longitude: m.longitude,
        location_city: m.location_city
      })));
    }

    // Transform to format needed for 3D map
    const memoriesForMap: MemoryForMap[] = (memories || [])
      .filter((m: Memory) => {
        const hasLocation = m.latitude && m.longitude;
        const hasAudio = m.audio_url;
        if (!hasLocation) {
          console.log('[v0] API: Filtered out memory (no location):', m.id);
        }
        if (!hasAudio) {
          console.log('[v0] API: Filtered out memory (no audio_url):', m.id);
        }
        return hasLocation && hasAudio;
      })
      .map((m: Memory) => ({
        id: m.id,
        latitude: m.latitude!,
        longitude: m.longitude!,
        windowVariant: (m.window_variant === 2 ? 2 : 1) as 1 | 2,
        location: m.location_city 
          ? `${m.location_city}${m.location_country ? `, ${m.location_country}` : ''}`
          : undefined,
        audioUrl: m.audio_url,
      }));
    
    console.log('[v0] API: Returning', memoriesForMap.length, 'memories for map');

    return NextResponse.json(
      { 
        memories: memoriesForMap,
        count: memoriesForMap.length 
      },
      { status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch memories';
    const stack = e instanceof Error ? e.stack : undefined;
    console.error('[v0] API: Exception fetching memories:', message);
    console.error('[v0] API: Stack trace:', stack);
    return NextResponse.json(
      { error: message, details: stack ? 'See server logs for details' : undefined },
      { status: 500 }
    );
  }
}

