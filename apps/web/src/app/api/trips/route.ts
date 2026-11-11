import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { generateInviteCode, createTripSchema } from '@yatra/shared';
import { HARDCODED_PIN } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createTripSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid trip data' },
        { status: 400 }
      );
    }

    const payload = result.data;
    const inviteCode = generateInviteCode();

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check PIN cookie from request
    const cookieHeader = request.headers.get('cookie') || '';
    const isPinAuth = cookieHeader.includes(`jalkhoj_pin=${HARDCODED_PIN}`);

    let userId = user?.id;

    // Check if admin service client is available
    const adminClient = getAdminClient();

    if (adminClient) {
      // If no auth user but PIN authenticated, fetch or create a lead profile
      if (!userId && isPinAuth) {
        const { data: existingProfiles } = await adminClient
          .from('profiles')
          .select('id')
          .limit(1);

        if (existingProfiles && existingProfiles.length > 0) {
          userId = existingProfiles[0].id;
        } else {
          // Check if an auth user exists
          const { data: userList } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
          if (userList?.users?.length) {
            userId = userList.users[0].id;
          } else {
            // Create a default admin user
            const { data: newUser } = await adminClient.auth.admin.createUser({
              email: 'admin@jalkhoj.app',
              password: 'JalKhoj_PIN_7977303911!',
              email_confirm: true,
              user_metadata: { full_name: 'Lead Traveler' },
            });
            userId = newUser?.user?.id;
          }
        }
      }

      if (userId) {
        const { data: trip, error: tripErr } = await adminClient
          .from('trips')
          .insert({
            name: payload.name,
            description: payload.description,
            start_date: payload.start_date,
            end_date: payload.end_date,
            invite_code: inviteCode,
            created_by: userId,
          })
          .select()
          .single();

        if (tripErr) throw tripErr;

        await adminClient.from('trip_members').upsert({
          trip_id: trip.id,
          user_id: userId,
          role: 'organizer',
        });

        return NextResponse.json({ success: true, trip });
      }
    }

    // Fallback: Standard client insert
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated. Please log in first.' },
        { status: 401 }
      );
    }

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        name: payload.name,
        description: payload.description,
        start_date: payload.start_date,
        end_date: payload.end_date,
        invite_code: inviteCode,
        created_by: userId,
      })
      .select()
      .single();

    if (tripError) throw tripError;

    await supabase.from('trip_members').upsert({
      trip_id: trip.id,
      user_id: userId,
      role: 'organizer',
    });

    return NextResponse.json({ success: true, trip });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create trip';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
