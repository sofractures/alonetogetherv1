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

    // Get location data from request body if provided
    const body = Object.fromEntries(form.entries());
    const locationData = body.location ? JSON.parse(body.location as string) : null;

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

      const { data, error } = await supabaseServer
        .from('memories')
        .insert(insertData)
        .select('id')
        .single();
      
      if (error) {
        console.error('[v0] API: Error creating memory record:', error);
        console.error('[v0] API: Error code:', error.code);
        console.error('[v0] API: Error message:', error.message);
        console.error('[v0] API: Error details:', error.details);
        console.error('[v0] API: Error hint:', error.hint);
        console.error('[v0] API: Insert data was:', JSON.stringify(insertData, null, 2));
      } else if (data?.id) {
        memoryId = data.id;
        console.log('[v0] API: Memory record created successfully, ID:', memoryId);
        console.log('[v0] API: Location data saved:', {
          hasLat: !!insertData.latitude,
          hasLng: !!insertData.longitude,
          lat: insertData.latitude,
          lng: insertData.longitude,
          city: insertData.location_city,
          country: insertData.location_country
        });
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
    const message = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


