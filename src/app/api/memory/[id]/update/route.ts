import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memoryId } = await params;
    const body = await req.json();

    // Validate memoryId
    if (!memoryId) {
      return NextResponse.json({ error: 'Memory ID is required' }, { status: 400 });
    }

    // Build update data object
    const updateData: {
      email?: string;
      user_name?: string;
      latitude?: number;
      longitude?: number;
      location_city?: string;
      location_country?: string;
      display_name?: string;
    } = {};

    if (body.email) {
      updateData.email = body.email.trim();
    }
    if (body.user_name) {
      updateData.user_name = body.user_name.trim().slice(0, 120);
    }
    if (body.location) {
      const location = body.location;
      if (location.latitude && location.longitude) {
        updateData.latitude = parseFloat(location.latitude);
        updateData.longitude = parseFloat(location.longitude);
      }
      if (location.city) {
        updateData.location_city = location.city;
      }
      if (location.country) {
        updateData.location_country = location.country;
      }
      if (location.name) {
        updateData.display_name = location.name.slice(0, 120);
      }
    }

    // Update the memory record
    const { data, error } = await supabaseServer
      .from('memories')
      .update(updateData)
      .eq('id', memoryId)
      .select('id, email, user_name, latitude, longitude, location_city, location_country')
      .single();

    if (error) {
      console.error('[v0] API: Error updating memory:', error);
      return NextResponse.json(
        { error: 'Failed to update memory', details: error.message },
        { status: 500 }
      );
    }

    console.log('[v0] API: Successfully updated memory:', memoryId, updateData);
    return NextResponse.json({ success: true, memory: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update memory';
    console.error('[v0] API: Exception updating memory:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

