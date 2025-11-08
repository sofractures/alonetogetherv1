import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memoryId = params.id;

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
      return NextResponse.json(
        { error: 'Audio not available for this memory' },
        { status: 404 }
      );
    }

    // Create a signed URL for the audio file
    // audio_url is stored as a path like "final/{uuid}.mp3"
    const { data: signedData, error: signedError } = await supabaseServer
      .storage
      .from('processed-songs')
      .createSignedUrl(memory.audio_url, 3600); // 1 hour expiry

    if (signedError || !signedData?.signedUrl) {
      console.error('[v0] API: Error creating signed URL:', signedError);
      return NextResponse.json(
        { error: 'Failed to generate audio URL' },
        { status: 500 }
      );
    }

    // Redirect to the signed URL
    return NextResponse.redirect(signedData.signedUrl);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to get audio';
    console.error('[v0] API: Exception getting audio:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

