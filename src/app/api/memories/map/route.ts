import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { Memory, MemoryForMap } from '@/types/memory';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Fetch all memories with location data
    const { data: memories, error } = await supabaseServer
      .from('memories')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching memories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch memories', details: error.message },
        { status: 500 }
      );
    }

    // Transform to format needed for 3D map
    const memoriesForMap: MemoryForMap[] = (memories || [])
      .filter((m: Memory) => m.latitude && m.longitude)
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

    return NextResponse.json(
      { 
        memories: memoriesForMap,
        count: memoriesForMap.length 
      },
      { status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch memories';
    console.error('Exception fetching memories:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

