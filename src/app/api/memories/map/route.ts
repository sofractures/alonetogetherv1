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

    // Fetch all memories - we know audio_url exists because playback works
    // Filter in JavaScript to avoid PostgREST syntax issues
    const { data: allMemories, error: queryError } = await supabaseServer
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (queryError) {
      console.error('[v0] API: Query failed:', queryError);
      throw queryError;
    }
    
    console.log('[v0] API: Fetched', allMemories?.length || 0, 'total memories from database');
    
    // Filter for memories with location and audio_url (we know these exist since playback works)
    const memories = (allMemories || []).filter((m: Memory) => {
      const hasLocation = m.latitude != null && m.longitude != null;
      const hasAudio = m.audio_url != null && m.audio_url.trim() !== '';
      
      if (!hasLocation) {
        console.log('[v0] API: Filtered out memory (no location):', m.id, 'lat:', m.latitude, 'lng:', m.longitude);
      }
      if (!hasAudio) {
        console.log('[v0] API: Filtered out memory (no audio_url):', m.id, 'audio_url:', m.audio_url);
      }
      
      return hasLocation && hasAudio;
    }) as Memory[];
    
    console.log('[v0] API: After filtering,', memories.length, 'memories have both location and audio');
    
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

