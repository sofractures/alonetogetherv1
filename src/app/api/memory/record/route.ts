import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';
import { captureApiError } from '@/lib/sentry';

export const runtime = 'nodejs';

// SECURITY: Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// SECURITY: Sanitize string input to prevent XSS
function sanitizeString(input: string, maxLength: number = 120): string {
  return input.trim().slice(0, maxLength).replace(/[<>]/g, '');
}

// SECURITY: Allowed audio MIME types
const ALLOWED_AUDIO_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'video/webm', // Some browsers use video/webm for audio recordings
];

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Rate limit uploads to prevent abuse
    const clientIP = getClientIP(req.headers);
    const rateLimitResult = rateLimit(`upload:${clientIP}`, RATE_LIMITS.UPLOAD);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait a moment and try again.' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    // SECURITY: Validate file size (max 25MB)
    if (file.size <= 0 || file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
    }

    // SECURITY: Validate content type
    // MediaRecorder blobs often carry codec parameters (e.g. "audio/webm;codecs=opus"),
    // so compare against the base MIME type only.
    const contentType = file.type || 'audio/webm';
    const baseType = contentType.split(';')[0].trim().toLowerCase();
    if (!ALLOWED_AUDIO_TYPES.includes(baseType)) {
      console.error('[v0] API: Rejected upload with content type:', contentType);
      return NextResponse.json(
        { error: `Invalid file type: ${baseType}` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const path = `recordings/${crypto.randomUUID()}.webm`;

    const { error: uploadError } = await supabaseServer
      .storage
      .from('memory-songs')
      .upload(path, Buffer.from(arrayBuffer), {
        contentType: baseType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message, attemptedPath: path }, { status: 500 });
    }

    // Get location data, email, and name from request body if provided
    const body = Object.fromEntries(form.entries());
    
    // SECURITY: Parse and validate location data safely
    let locationData = null;
    if (body.location) {
      try {
        const parsed = JSON.parse(body.location as string);
        // Validate coordinate ranges if provided
        if (parsed.latitude !== undefined && parsed.longitude !== undefined) {
          const lat = parseFloat(parsed.latitude);
          const lng = parseFloat(parsed.longitude);
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
          }
          parsed.latitude = lat;
          parsed.longitude = lng;
        }
        // Sanitize string fields
        if (parsed.city) parsed.city = sanitizeString(parsed.city, 100);
        if (parsed.country) parsed.country = sanitizeString(parsed.country, 100);
        if (parsed.name) parsed.name = sanitizeString(parsed.name, 120);
        locationData = parsed;
      } catch {
        return NextResponse.json({ error: 'Invalid location data' }, { status: 400 });
      }
    }
    
    // SECURITY: Validate and sanitize user inputs
    const displayName = body.display_name ? sanitizeString(body.display_name as string, 120) : null;
    const rawEmail = (body.email as string | undefined)?.toString()?.trim()?.toLowerCase() || null;
    const email = rawEmail && isValidEmail(rawEmail) ? rawEmail : null;
    const userName = body.user_name ? sanitizeString(body.user_name as string, 120) : null;

    // Try creating a DB entry (optional if table exists)
    let memoryId: string | null = null;
    try {
      const insertData: {
        raw_recording_url: string;
        latitude?: number;
        longitude?: number;
        location_city?: string;
        location_country?: string;
        window_variant?: number;
        display_name?: string | null;
        email?: string | null;
        user_name?: string | null;
      } = { 
        raw_recording_url: path,
        window_variant: Math.floor(Math.random() * 2) + 1, // Random 1 or 2
      };
      
      // Add location data if provided
      if (locationData) {
        if (locationData.latitude && locationData.longitude) {
          insertData.latitude = parseFloat(locationData.latitude);
          insertData.longitude = parseFloat(locationData.longitude);
        }
        if (locationData.city) insertData.location_city = locationData.city;
        if (locationData.country) insertData.location_country = locationData.country;
      }
      if (displayName) insertData.display_name = displayName;
      if (email) insertData.email = email;
      if (userName) insertData.user_name = userName;

      const { data, error } = await supabaseServer
        .from('memories')
        .insert(insertData)
        .select('id')
        .single();
      
      if (error) {
        // SECURITY: Log error code only, not full details or user data
        console.error('[v0] API: Error creating memory record, code:', error.code);
        // Don't fail the request - continue without memoryId
        // The audio processor can still work, but won't update the database
      } else if (data?.id) {
        memoryId = data.id;
        // SECURITY: Only log non-sensitive confirmation
        console.log('[v0] API: Memory record created successfully');
      } else {
        console.warn('[v0] API: Memory record insert succeeded but no ID returned');
      }
    } catch (error) {
      console.error('[v0] API: Exception creating memory record:', error);
    }

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
    // Track error with Sentry
    captureApiError(e, {
      route: '/api/memory/record',
      method: 'POST',
    });
    const message = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


