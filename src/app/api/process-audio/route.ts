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

    // 2) Load instrumental with robust fallbacks: Supabase Storage -> HTTP -> filesystem
    let instrumentalBytes: Uint8Array;
    const origin = req.nextUrl.origin;
    const instrumentalUrl = new URL('/assets/instrumental.mp3', origin).toString();
    let storageTried = false;
    let storageErr: string | null = null;
    let httpTried = false;
    let httpStatus: number | null = null;
    let httpErr: string | null = null;
    // Try Supabase Storage 'assets' bucket first (path: instrumental.mp3)
    try {
      storageTried = true;
      const { data: instDl, error: instErr } = await supabaseServer
        .storage
        .from('assets')
        .download('instrumental.mp3');
      if (instErr || !instDl) {
        throw new Error(instErr?.message || 'download returned null');
      }
      instrumentalBytes = new Uint8Array(await instDl.arrayBuffer());
    } catch (se) {
      storageErr = se instanceof Error ? se.message : 'unknown';
      // Fallback to HTTP fetch from public assets
      try {
        httpTried = true;
        const resp = await fetch(instrumentalUrl);
        httpStatus = resp.status;
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const ab = await resp.arrayBuffer();
        instrumentalBytes = new Uint8Array(ab);
      } catch (e) {
        httpErr = e instanceof Error ? e.message : 'unknown';
        // Final fallback: filesystem (local/dev)
        try {
          const instrumentalFsPath = path.join(process.cwd(), 'public', 'assets', 'instrumental.mp3');
          const buf = await fs.readFile(instrumentalFsPath);
          instrumentalBytes = new Uint8Array(buf);
        } catch (fsErr) {
          const fsPath = path.join(process.cwd(), 'public', 'assets', 'instrumental.mp3');
          return NextResponse.json({
            error: 'instrumental.mp3 not accessible',
            diagnostics: {
              storage: { tried: storageTried, bucket: 'assets', path: 'instrumental.mp3', error: storageErr },
              http: { tried: httpTried, url: instrumentalUrl, status: httpStatus, error: httpErr },
              fs: { tried: true, path: fsPath, error: fsErr instanceof Error ? fsErr.message : 'unknown' },
            },
          }, { status: 500 });
        }
      }
    }

    // 3) Initialize FFmpeg (WASM) - dynamically import for Turbopack compatibility
    let ffmpegModule: unknown;
    let importError: string | null = null;
    try {
      ffmpegModule = await import('@ffmpeg/ffmpeg');
    } catch (e) {
      importError = e instanceof Error ? e.message : 'unknown';
      return NextResponse.json({
        error: 'Failed to import @ffmpeg/ffmpeg',
        diagnostics: { importError, moduleKeys: null },
      }, { status: 500 });
    }
    type FFmpegFS = {
      (op: 'writeFile', filePath: string, data: Uint8Array): void;
      (op: 'readFile', filePath: string): Uint8Array;
    };
    type FFmpegFactory = (opts?: { log?: boolean; corePath?: string }) => {
      load: () => Promise<void>;
      FS: FFmpegFS;
      run: (...args: string[]) => Promise<void>;
    };
    type FFmpegDynamicModule = { createFFmpeg?: FFmpegFactory; default?: { createFFmpeg?: FFmpegFactory } };
    const resolved = ffmpegModule as unknown as FFmpegDynamicModule;
    const createFFmpegFn: FFmpegFactory | undefined = resolved.createFFmpeg ?? resolved.default?.createFFmpeg;
    if (!createFFmpegFn) {
      return NextResponse.json({
        error: 'FFmpeg WASM factory not found',
        diagnostics: {
          moduleKeys: Object.keys(ffmpegModule),
          hasCreateFFmpeg: 'createFFmpeg' in (ffmpegModule || {}),
          hasDefault: 'default' in (ffmpegModule || {}),
        },
      }, { status: 500 });
    }
    const corePath = process.env.FFMPEG_CORE_URL || 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js';
    let ffmpeg: ReturnType<FFmpegFactory>;
    let loadError: string | null = null;
    try {
      ffmpeg = createFFmpegFn({ log: true, corePath });
      await ffmpeg.load();
    } catch (e) {
      loadError = e instanceof Error ? e.message : 'unknown';
      return NextResponse.json({
        error: 'FFmpeg WASM failed to load',
        diagnostics: { loadError, corePath, nodeEnv: process.env.NODE_ENV },
      }, { status: 500 });
    }

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



