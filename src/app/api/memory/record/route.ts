import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    // Optional: basic validation
    if (file.size <= 0 || file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const path = `recordings/${crypto.randomUUID()}.webm`;

    const { error: uploadError } = await supabaseServer
      .storage
      .from('memory-songs')
      .upload(path, Buffer.from(arrayBuffer), {
        contentType: file.type || 'audio/webm',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message, attemptedPath: path }, { status: 500 });
    }

    // Try creating a DB entry (optional if table exists)
    let memoryId: string | null = null;
    try {
      const { data, error } = await supabaseServer
        .from('memories')
        .insert({ raw_recording_url: path })
        .select('id')
        .single();
      if (!error && data?.id) memoryId = data.id;
    } catch {}

    // Diagnostics: verify object exists by listing and creating a signed URL
    const listRes = await supabaseServer
      .storage
      .from('memory-songs')
      .list('recordings', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

    let signedUrl: string | null = null;
    const { data: signedData } = await supabaseServer
      .storage
      .from('memory-songs')
      .createSignedUrl(path, 60);
    if (signedData?.signedUrl) signedUrl = signedData.signedUrl;

    return NextResponse.json({ path, memoryId, diagnostics: { listCount: (listRes.data?.length ?? 0), signedUrl } }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


