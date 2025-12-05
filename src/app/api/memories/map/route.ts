import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { Memory, MemoryForMap } from '@/types/memory';
import crypto from 'crypto';

export const runtime = 'nodejs';

// SECURITY: Hash email for ownership verification without exposing the actual email
function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 16);
}

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
      console.error('[v0] API: Error code:', queryError.code);
      console.error('[v0] API: Error message:', queryError.message);
      console.error('[v0] API: Error details:', queryError.details);
      console.error('[v0] API: Error hint:', queryError.hint);
      return NextResponse.json(
        { 
          error: 'Failed to fetch memories from database',
          details: queryError.message || 'Unknown error',
          code: queryError.code,
          hint: queryError.hint
        },
        { status: 500 }
      );
    }
    
    console.log('[v0] API: Fetched', allMemories?.length || 0, 'total memories from database');
    
    // Filter for memories with location and audio_url (we know these exist since playback works)
    const memories = (allMemories || []).filter((m: Memory) => {
      const hasLocation = m.latitude != null && m.longitude != null;
      const hasAudio = m.audio_url != null && m.audio_url.trim() !== '';
      
      if (!hasLocation) {
        console.log('[v0] API: ❌ Filtered out memory (no location):', {
          id: m.id,
          lat: m.latitude,
          lng: m.longitude,
          city: m.location_city,
          country: m.location_country,
          hasAudio: hasAudio,
          audio_url: m.audio_url
        });
      }
      if (!hasAudio) {
        console.log('[v0] API: ❌ Filtered out memory (no audio_url):', {
          id: m.id,
          audio_url: m.audio_url,
          hasLocation: hasLocation,
          lat: m.latitude,
          lng: m.longitude
        });
      }
      
      if (hasLocation && hasAudio) {
        console.log('[v0] API: ✅ Memory passed filter:', {
          id: m.id,
          location: `${m.location_city || ''}, ${m.location_country || ''}`,
          lat: m.latitude,
          lng: m.longitude,
          audio_url: m.audio_url
        });
      }
      
      return hasLocation && hasAudio;
    }) as Memory[];
    
    console.log('[v0] API: After filtering,', memories.length, 'memories have both location and audio');
    
    if (memories && memories.length > 0) {
      console.log('[v0] API: Memory details:', memories.map((m: Memory) => ({
        id: m.id,
        audio_url: m.audio_url,
        latitude: m.latitude,
        longitude: m.longitude,
        location_city: m.location_city
      })));
    }

    // Transform to format needed for 3D map (memories are already filtered)
    // SECURITY: Do NOT expose email addresses publicly - hash them for ownership check
    const memoriesForMap: MemoryForMap[] = memories.map((m: Memory) => ({
        id: m.id,
        latitude: m.latitude!,
        longitude: m.longitude!,
        windowVariant: (m.window_variant === 2 ? 2 : 1) as 1 | 2,
        location: m.location_city 
          ? `${m.location_city}${m.location_country ? `, ${m.location_country}` : ''}`
          : undefined,
        audioUrl: m.audio_url,
        name: m.display_name,
        createdAt: m.created_at, // Include creation timestamp for sorting
        // SECURITY: Hash email for client-side ownership comparison instead of exposing raw email
        emailHash: m.email ? hashEmail(m.email) : undefined,
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
    
    // If it's a Supabase error, include more details
    interface SupabaseError {
      message?: string;
      code?: string;
      hint?: string;
    }
    const supabaseError = e as SupabaseError;
    const errorDetails = supabaseError?.message || message;
    const errorCode = supabaseError?.code;
    const errorHint = supabaseError?.hint;
    
    return NextResponse.json(
      { 
        error: 'Exception while fetching memories',
        details: errorDetails,
        code: errorCode,
        hint: errorHint,
        stack: process.env.NODE_ENV === 'development' ? stack : undefined
      },
      { status: 500 }
    );
  }
}

