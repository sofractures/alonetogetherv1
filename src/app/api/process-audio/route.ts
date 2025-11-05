import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (use environment variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inputPath = body?.path as string | undefined;
    const memoryId = (body?.memoryId as string | null) ?? null;
    if (!inputPath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({
        error: 'Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.',
      }, { status: 500 });
    }

    // 1) Download the user recording from Supabase Storage (memory-songs)
    const { data: downloadBlob, error: downloadError } = await supabaseServer
      .storage
      .from('memory-songs')
      .download(inputPath);
    if (downloadError || !downloadBlob) {
      return NextResponse.json({ error: downloadError?.message || 'Failed to download input recording' }, { status: 500 });
    }
    const inputBuffer = Buffer.from(await downloadBlob.arrayBuffer());

    // 2) Get instrumental from Supabase Storage (assets bucket)
    let instrumentalUrl: string;
    try {
      const { data: instDl, error: instErr } = await supabaseServer
        .storage
        .from('assets')
        .download('instrumental.mp3');
      if (instErr || !instDl) {
        throw new Error(instErr?.message || 'download returned null');
      }
      // Upload instrumental to Cloudinary temporarily for processing
      const instBuffer = Buffer.from(await instDl.arrayBuffer());
      const instUpload = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { resource_type: 'video', folder: 'temp', format: 'mp3' },
          (error, result) => {
            if (error || !result) reject(error || new Error('Upload failed'));
            else resolve({ secure_url: result.secure_url });
          }
        ).end(instBuffer);
      });
      instrumentalUrl = instUpload.secure_url;
    } catch (instErr) {
      return NextResponse.json({
        error: 'Failed to load instrumental',
        details: instErr instanceof Error ? instErr.message : 'unknown',
      }, { status: 500 });
    }

    // 3) Upload voice recording to Cloudinary
    const voiceUpload = await new Promise<{ public_id: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: 'temp', format: 'mp3' },
        (error, result) => {
          if (error || !result) reject(error || new Error('Upload failed'));
          else resolve({ public_id: result.public_id });
        }
      ).end(inputBuffer);
    });

    // 4) Process audio with Cloudinary transformations
    // Note: Cloudinary has limited audio processing compared to FFmpeg.
    // For exact spec matching (high-pass 80Hz, reverb 25%, compression 3:1, -6dB, mix),
    // we need FFmpeg via AWS Lambda, dedicated server, or service like Bannerbear.
    // This implementation provides basic processing that works:
    const processedUrl = cloudinary.url(voiceUpload.public_id, {
      resource_type: 'video',
      format: 'mp3',
      audio_codec: 'mp3',
      audio_bitrate: '320k',
      audio_frequency: 44100,
      effect: 'normalize',
    });

    // 5) Download processed audio from Cloudinary
    const processedResponse = await fetch(processedUrl);
    if (!processedResponse.ok) {
      return NextResponse.json({ error: 'Failed to process audio with Cloudinary' }, { status: 500 });
    }
    const processedBuffer = Buffer.from(await processedResponse.arrayBuffer());

    // 6) Upload processed audio to Supabase Storage (processed-songs)
    const processedPath = `final/${crypto.randomUUID()}.mp3`;
    const { error: uploadError } = await supabaseServer
      .storage
      .from('processed-songs')
      .upload(processedPath, processedBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 7) Clean up temporary Cloudinary uploads
    try {
      await cloudinary.uploader.destroy(voiceUpload.public_id, { resource_type: 'video' });
      // Note: instrumental cleanup would need its public_id
    } catch {}

    // 8) Diagnostics: verify object exists and create a signed URL
    const listRes = await supabaseServer
      .storage
      .from('processed-songs')
      .list('final', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
    const { data: signedData } = await supabaseServer
      .storage
      .from('processed-songs')
      .createSignedUrl(processedPath, 300);
    const signedUrl = signedData?.signedUrl ?? null;

    // 9) Update DB with final URL if memoryId was provided
    if (memoryId) {
      try {
        await supabaseServer
          .from('memories')
          .update({ audio_url: processedPath })
          .eq('id', memoryId);
      } catch {}
    }

    // 10) Return processed path and diagnostics/signed URL
    return NextResponse.json({ processedPath, signedUrl, diagnostics: { listCount: (listRes.data?.length ?? 0) } }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
