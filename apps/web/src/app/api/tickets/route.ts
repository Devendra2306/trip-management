import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { addTicketSchema } from '@yatra/shared';
import { HARDCODED_PIN } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = addTicketSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid ticket data' },
        { status: 400 }
      );
    }

    const payload = result.data;
    const tripId = body.trip_id;
    if (!tripId) {
      return NextResponse.json({ error: 'trip_id is required' }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cookieHeader = request.headers.get('cookie') || '';
    const isPinAuth = cookieHeader.includes(`jalkhoj_pin=${HARDCODED_PIN}`);

    let userId = user?.id;

    const adminClient = getAdminClient();
    const db = adminClient || supabase;

    if (!userId && isPinAuth) {
      userId = '00000000-0000-0000-0000-000000000001';
    }

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: ticket, error: ticketError } = await db
      .from('tickets')
      .insert({
        trip_id: tripId,
        pnr: payload.pnr,
        train_number: payload.train_number,
        train_name: payload.train_name,
        from_station: payload.from_station.toUpperCase(),
        from_station_name: payload.from_station_name,
        to_station: payload.to_station.toUpperCase(),
        to_station_name: payload.to_station_name,
        boarding_date: payload.boarding_date,
        journey_class: payload.journey_class,
        added_by: userId,
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    return NextResponse.json({ success: true, ticket });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add ticket';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
