import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { Memory, MemoryForMap } from '@/types/memory';
import crypto from 'crypto';
import { captureApiError } from '@/lib/sentry';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// SECURITY: Hash email for ownership verification without exposing the actual email
function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 16);
}

export async function GET(req: NextRequest) {
  try {
    const clientIP = getClientIP(req.headers);
    const rateLimitResult = rateLimit(`map:${clientIP}`, RATE_LIMITS.READ);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    console.log('[v0] API: Starting memory fetch...');
    
    // Check if Supabase client is initialized
    if (!supabaseServer) {
      console.error('[v0] API: Supabase client not initialized');
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Explicit columns — avoid select('*'); email used only for hashing
    const { data: allMemories, error: queryError } = await supabaseServer
      .from('memories')
      .select('id, latitude, longitude, window_variant, location_city, location_country, audio_url, display_name, created_at, email')
      .order('created_at', { ascending: false })
      .limit(2000);
    
    if (queryError) {
      console.error('[v0] API: Query failed:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch memories from database' },
        { status: 500 }
      );
    }
    
    console.log('[v0] API: Fetched', allMemories?.length || 0, 'total memories from database');
    
    const memories = ((allMemories || []) as Memory[]).filter((m) => {
      const hasLocation = m.latitude != null && m.longitude != null;
      const hasAudio = m.audio_url != null && m.audio_url.trim() !== '';
      return hasLocation && hasAudio;
    });
    
    console.log('[v0] API: After filtering,', memories.length, 'memories have both location and audio');

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
        createdAt: m.created_at,
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
    captureApiError(e, {
      route: '/api/memories/map',
      method: 'GET',
    });
    
    const message = e instanceof Error ? e.message : 'Failed to fetch memories';
    console.error('[v0] API: Exception fetching memories:', message);
    
    return NextResponse.json(
      { error: 'Exception while fetching memories' },
      { status: 500 }
    );
  }
}
