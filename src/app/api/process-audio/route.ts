import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inputPath = body?.path as string | undefined;
    const memoryId = (body?.memoryId as string | null) ?? null;
    if (!inputPath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    // 1) Download the user recording from Supabase Storage (memory-songs)
    const { data: downloadBlob, error: downloadError } = await supabaseServer
      .storage
      .from('memory-songs')
      .download(inputPath);
    if (downloadError || !downloadBlob) {
      return NextResponse.json({ error: downloadError?.message || 'Failed to download input recording' }, { status: 500 });
    }
    const inputBytes = new Uint8Array(await downloadBlob.arrayBuffer());

    // 2) TEMPORARY: Stub processing since FFmpeg WASM doesn't work in serverless Node.js
    // TODO: Implement real processing via external service (Cloudinary, AWS Lambda, or dedicated server)
    // For now, upload the raw recording as "processed" to test the UI flow
    const processedPath = `final/${crypto.randomUUID()}.mp3`;
    const { error: uploadError } = await supabaseServer
      .storage
      .from('processed-songs')
      .upload(processedPath, Buffer.from(inputBytes), {
        contentType: 'audio/webm', // Using webm for now since we're not processing
        upsert: false,
      });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Diagnostics: verify object exists and create a signed URL
    const listRes = await supabaseServer
      .storage
      .from('processed-songs')
      .list('final', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
    const { data: signedData } = await supabaseServer
      .storage
      .from('processed-songs')
      .createSignedUrl(processedPath, 300);
    const signedUrl = signedData?.signedUrl ?? null;

    // 7) Update DB with final URL if memoryId was provided
    if (memoryId) {
      try {
        await supabaseServer
          .from('memories')
          .update({ audio_url: processedPath })
          .eq('id', memoryId);
      } catch {}
    }

    // 8) Return processed path and diagnostics/signed URL
    return NextResponse.json({ processedPath, signedUrl, diagnostics: { listCount: (listRes.data?.length ?? 0) } }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



