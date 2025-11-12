import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memoryId } = await params;

    if (!memoryId) {
      return NextResponse.json(
        { error: 'Memory ID is required' },
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
      console.error('[v0] API: Error creating signed URL:', {
        error: signedError,
        path: cleanPath,
        memoryId: memoryId,
        originalPath: memory.audio_url
      });
      return NextResponse.json(
        { error: 'Failed to generate audio URL', details: signedError?.message },
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

