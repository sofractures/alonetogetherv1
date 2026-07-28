import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';
import { captureApiError } from '@/lib/sentry';

export const runtime = 'nodejs';

// SECURITY: Validate UUID format to prevent injection attacks
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// SECURITY: Basic email validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// SECURITY: Sanitize string input
function sanitizeString(input: string, maxLength: number = 120): string {
  return input.trim().slice(0, maxLength).replace(/[<>]/g, ''); // Remove potential XSS chars
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIP = getClientIP(req.headers);
    const rateLimitResult = rateLimit(`update:${clientIP}`, RATE_LIMITS.WRITE);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const { id: memoryId } = await params;
    const body = await req.json();

    // SECURITY: Validate memoryId format to prevent injection
    if (!memoryId || !isValidUUID(memoryId)) {
      return NextResponse.json({ error: 'Invalid memory ID format' }, { status: 400 });
    }

    // SECURITY: Check if this memory already has an email (already claimed)
    // Once a memory is pinned with an email, it cannot be modified
    const { data: existingMemory, error: fetchError } = await supabaseServer
      .from('memories')
      .select('id, email')
      .eq('id', memoryId)
      .single();

    if (fetchError || !existingMemory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // SECURITY: If memory already has an email, reject update attempts
    // This prevents unauthorized users from hijacking memories
    if (existingMemory.email) {
      return NextResponse.json(
        { error: 'This memory has already been claimed and cannot be modified' },
        { status: 403 }
      );
    }

    // Build update data object with validation
    const updateData: {
      email?: string;
      user_name?: string;
      latitude?: number;
      longitude?: number;
      location_city?: string;
      location_country?: string;
      display_name?: string;
    } = {};

    // SECURITY: Validate and sanitize email
    if (body.email) {
      const email = body.email.trim().toLowerCase();
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
      updateData.email = email;
    }

    // SECURITY: Sanitize user_name
    if (body.user_name) {
      updateData.user_name = sanitizeString(body.user_name, 120);
    }

    // SECURITY: Validate and sanitize location data
    if (body.location) {
      const location = body.location;
      if (location.latitude !== undefined && location.longitude !== undefined) {
        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);
        
        // Validate coordinate ranges
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
        }
        
        updateData.latitude = lat;
        updateData.longitude = lng;
      }
      if (location.city) {
        updateData.location_city = sanitizeString(location.city, 100);
      }
      if (location.country) {
        updateData.location_country = sanitizeString(location.country, 100);
      }
      if (location.name) {
        updateData.display_name = sanitizeString(location.name, 120);
      }
    }

    // Atomic claim: only update rows that still have no email (prevents race hijack)
    let query = supabaseServer
      .from('memories')
      .update(updateData)
      .eq('id', memoryId);

    if (updateData.email) {
      query = query.is('email', null);
    }

    const { data, error } = await query
      .select('id, latitude, longitude, location_city, location_country')
      .maybeSingle();

    if (error) {
      console.error('[v0] API: Error updating memory:', error.code);
      return NextResponse.json(
        { error: 'Failed to update memory' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'This memory has already been claimed and cannot be modified' },
        { status: 403 }
      );
    }

    // SECURITY: Don't log sensitive data, only log success with ID
    console.log('[v0] API: Successfully updated memory:', memoryId);
    
    // SECURITY: Don't return email in response
    return NextResponse.json({ success: true, memoryId: data.id });
  } catch (e) {
    // Track error with Sentry
    captureApiError(e, {
      route: '/api/memory/[id]/update',
      method: 'PATCH',
    });
    console.error('[v0] API: Exception updating memory');
    return NextResponse.json(
      { error: 'Failed to update memory' },
      { status: 500 }
    );
  }
}
