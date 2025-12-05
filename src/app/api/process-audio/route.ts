import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// SECURITY: Validate UUID format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// SECURITY: Validate storage path format to prevent path traversal
function isValidStoragePath(path: string): boolean {
  // Only allow alphanumeric, hyphens, underscores, periods, and forward slashes
  // Must not contain .. (directory traversal)
  const pathRegex = /^[a-zA-Z0-9\-_./]+$/;
  return pathRegex.test(path) && !path.includes('..') && !path.startsWith('/');
}

export async function POST(req: NextRequest) {
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
    const memoryId = (body?.memoryId as string | null) ?? null;
    
    // SECURITY: Validate input path
    if (!inputPath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }
    
    // SECURITY: Validate path format to prevent path traversal attacks
    if (!isValidStoragePath(inputPath)) {
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

    const fullUrl = `${processorUrl}/process-audio`;
    console.log('[process-audio] Calling processor:', fullUrl, 'with path:', inputPath);

    // Invoke audio processor service
    try {
      const processorResponse = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputPath,
          instrumentalPath: 'instrumental.mp3',
          memoryId,
        }),
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
      const errorMsg = processorError instanceof Error ? processorError.message : 'Processor invocation failed';
      console.error('[process-audio] Processor fetch failed:', errorMsg, 'URL was:', fullUrl);
      return NextResponse.json({
        error: 'Failed to invoke audio processor service',
        details: errorMsg,
      }, { status: 500 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
