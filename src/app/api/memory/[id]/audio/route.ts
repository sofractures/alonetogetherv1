import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// SECURITY: Validate UUID format to prevent injection attacks
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIP = getClientIP(req.headers);
    const rateLimitResult = rateLimit(`audio:${clientIP}`, RATE_LIMITS.READ);
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

    const { id: memoryId } = await params;

    // SECURITY: Validate UUID format
    if (!memoryId || !isValidUUID(memoryId)) {
      return NextResponse.json(
        { error: 'Invalid memory ID format' },
        { status: 400 }
      );
    }

    // Fetch the memory record to get the audio_url path
    const { data: memory, error: fetchError } = await supabaseServer
      .from('memories')
      .select('audio_url')
      .eq('id', memoryId)
      .single();

    if (fetchError || !memory) {
      console.error('[v0] API: Error fetching memory:', fetchError);
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      );
    }

    if (!memory.audio_url) {
      console.error('[v0] API: Memory has no audio_url:', memoryId);
      return NextResponse.json(
        { error: 'Audio not available for this memory' },
        { status: 404 }
      );
    }

    // Create a signed URL for the audio file
    // audio_url is stored as a path like "final/{uuid}.mp3" or just "{uuid}.mp3"
    console.log('[v0] API: Creating signed URL for memory:', memoryId, 'path:', memory.audio_url);
    
    // Ensure the path doesn't have leading slashes
    const cleanPath = memory.audio_url.startsWith('/') ? memory.audio_url.slice(1) : memory.audio_url;
    
    const { data: signedData, error: signedError } = await supabaseServer
      .storage
      .from('processed-songs')
      .createSignedUrl(cleanPath, 3600); // 1 hour expiry

    if (signedError || !signedData?.signedUrl) {
      // SECURITY: Log error internally but don't expose details to client
      console.error('[v0] API: Error creating signed URL for memory:', memoryId);
      return NextResponse.json(
        { error: 'Failed to generate audio URL' },
        { status: 500 }
      );
    }
    
    console.log('[v0] API: Successfully created signed URL for:', memoryId);

    // Return the signed URL as JSON
    // The client will use this URL directly in the audio element
    return NextResponse.json({ url: signedData.signedUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to get audio';
    console.error('[v0] API: Exception getting audio:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
