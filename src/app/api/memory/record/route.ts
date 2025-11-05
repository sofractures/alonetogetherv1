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
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({ path }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


