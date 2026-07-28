import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';
import { captureProcessingError, captureApiError } from '@/lib/sentry';

export const runtime = 'nodejs';
/** Allow long FFmpeg mixes (droplet timeout is 5 min). */
export const maxDuration = 300;

// SECURITY: Validate UUID format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// SECURITY: Only process uploads under recordings/ — prevents arbitrary bucket path processing
function isValidRecordingPath(path: string): boolean {
  const pathRegex = /^recordings\/[a-zA-Z0-9\-_]+\.(webm|ogg|mp4|mpeg|wav|m4a)$/;
  return pathRegex.test(path) && !path.includes('..') && !path.startsWith('/');
}

export async function POST(req: NextRequest) {
  let memoryId: string | null = null;
  try {
    // SECURITY: Rate limit processing requests to prevent abuse
    const clientIP = getClientIP(req.headers);
    const rateLimitResult = rateLimit(`process:${clientIP}`, RATE_LIMITS.PROCESS);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          }
        }
      );
    }
    const body = await req.json();
    const inputPath = body?.path as string | undefined;
    memoryId = (body?.memoryId as string | null) ?? null;
    
    // SECURITY: Validate input path
    if (!inputPath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }
    
    // SECURITY: Validate path format — recordings/ only
    if (!isValidRecordingPath(inputPath)) {
      return NextResponse.json({ error: 'Invalid path format' }, { status: 400 });
    }
    
    // SECURITY: Validate memoryId format if provided
    if (memoryId && !isValidUUID(memoryId)) {
      return NextResponse.json({ error: 'Invalid memory ID format' }, { status: 400 });
    }

    // Check if audio processor service URL is configured
    const processorUrl = process.env.AUDIO_PROCESSOR_URL;
    if (!processorUrl) {
      return NextResponse.json({
        error: 'Audio processor service URL not configured. Please set AUDIO_PROCESSOR_URL environment variable.',
      }, { status: 500 });
    }

    const processorSecret = (process.env.AUDIO_PROCESSOR_SECRET || '').trim();
    if (!processorSecret && process.env.NODE_ENV === 'production') {
      console.error('[process-audio] AUDIO_PROCESSOR_SECRET missing in production');
      return NextResponse.json({
        error: 'Audio processor is not securely configured.',
      }, { status: 503 });
    }

    const fullUrl = `${processorUrl.replace(/\/$/, '')}/process-audio`;
    console.log('[process-audio] Calling processor:', fullUrl, 'with path:', inputPath);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (processorSecret) {
      headers['Authorization'] = `Bearer ${processorSecret}`;
      headers['x-processor-secret'] = processorSecret;
    }

    // Invoke audio processor service (abort before Vercel hard-kills the function)
    try {
      const processorResponse = await fetch(fullUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          inputPath,
          instrumentalPath: 'instrumental.mp3',
          memoryId,
        }),
        signal: AbortSignal.timeout(290_000),
      });

      const processorData = await processorResponse.json();

      if (!processorResponse.ok) {
        return NextResponse.json({
          error: processorData.error || 'Audio processing failed',
          details: processorData.details,
        }, { status: processorResponse.status || 500 });
      }

      // Create signed URL from Supabase (processor returns path, we create signed URL)
      const { data: signedData } = await supabaseServer
        .storage
        .from('processed-songs')
        .createSignedUrl(processorData.processedPath, 300);
      const signedUrl = signedData?.signedUrl ?? null;

      // Diagnostics: verify object exists
      const listRes = await supabaseServer
        .storage
        .from('processed-songs')
        .list('final', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

      // Verify database update if memoryId was provided
      if (memoryId) {
        try {
          const { data: updatedMemory, error: checkError } = await supabaseServer
            .from('memories')
            .select('id, audio_url, latitude, longitude')
            .eq('id', memoryId)
            .single();
          
          // SECURITY: Only log non-sensitive confirmation
          console.log('[v0] API: Verified memory after processing, success:', !!updatedMemory?.audio_url);
          
          if (checkError) {
            console.error('[v0] API: Error verifying memory');
          }
        } catch {
          console.error('[v0] API: Exception verifying memory');
        }
      }

      return NextResponse.json({
        processedPath: processorData.processedPath,
        signedUrl: signedUrl || processorData.signedUrl,
        diagnostics: { listCount: (listRes.data?.length ?? 0) },
      }, { status: 200 });
    } catch (processorError) {
      // Track processing error with Sentry
      captureProcessingError(processorError, {
        memoryId: memoryId || undefined,
        stage: 'process',
        extra: { processorUrl: fullUrl },
      });
      const errorMsg = processorError instanceof Error ? processorError.message : 'Processor invocation failed';
      console.error('[process-audio] Processor fetch failed:', errorMsg, 'URL was:', fullUrl);
      const timedOut =
        processorError instanceof Error &&
        (processorError.name === 'TimeoutError' || processorError.name === 'AbortError');
      return NextResponse.json({
        error: timedOut
          ? 'Audio processing timed out. Please try again.'
          : 'Failed to invoke audio processor service',
        details: errorMsg,
      }, { status: timedOut ? 504 : 500 });
    }
  } catch (e) {
    // Track error with Sentry
    captureApiError(e, {
      route: '/api/process-audio',
      method: 'POST',
    });
    const message = e instanceof Error ? e.message : 'Processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
