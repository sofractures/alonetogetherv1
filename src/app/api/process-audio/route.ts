import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import path from 'path';
import fs from 'fs/promises';

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

    // 2) Read instrumental.mp3 from the app's public assets
    const instrumentalFsPath = path.join(process.cwd(), 'public', 'assets', 'instrumental.mp3');
    let instrumentalBytes: Uint8Array;
    try {
      const buf = await fs.readFile(instrumentalFsPath);
      instrumentalBytes = new Uint8Array(buf);
    } catch (err) {
      return NextResponse.json({ error: 'instrumental.mp3 not found in /public/assets' }, { status: 500 });
    }

    // 3) Initialize FFmpeg (WASM) - dynamically import for Turbopack compatibility
    const { createFFmpeg } = await import('@ffmpeg/ffmpeg');
    const ffmpeg = createFFmpeg({ log: false });
    await ffmpeg.load();

    // 4) Write inputs to the in-memory FS
    ffmpeg.FS('writeFile', 'input.webm', inputBytes);
    ffmpeg.FS('writeFile', 'instrumental.mp3', instrumentalBytes);

    // 5) Run processing pipeline (HPF, compression, mix with instrumental, normalize out level)
    // Output: MP3 320kbps
    await ffmpeg.run(
      '-i', 'input.webm',
      '-i', 'instrumental.mp3',
      '-filter_complex',
      '[0:a]highpass=f=80,acompressor=ratio=3,volume=-6dB[voice];[voice][1:a]amix=inputs=2:duration=longest[out]',
      '-map', '[out]',
      '-b:a', '320k',
      'output.mp3'
    );

    // 6) Read output and upload to Supabase Storage (processed-songs)
    const outData = ffmpeg.FS('readFile', 'output.mp3');
    const processedPath = `final/${crypto.randomUUID()}.mp3`;
    const { error: uploadError } = await supabaseServer
      .storage
      .from('processed-songs')
      .upload(processedPath, Buffer.from(outData), {
        contentType: 'audio/mpeg',
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



