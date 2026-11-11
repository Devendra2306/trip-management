// Supabase Edge Function: Poll PNR status for all active tickets
// Triggered by pg_cron every 30 minutes

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Ticket {
  id: string;
  pnr: string;
  trip_id: string;
  train_number: string;
  train_name: string;
  boarding_date: string;
}

interface PnrApiResponse {
  pnr: string;
  train_number: string;
  train_name: string;
  from_station: { code: string; name: string };
  to_station: { code: string; name: string };
  boarding_date: string;
  journey_class: string;
  chart_prepared: boolean;
  passengers: {
    number: number;
    booking_status: string;
    current_status: string;
    coach: string | null;
    berth: string | null;
    berth_type: string | null;
  }[];
}

/** Determine polling interval based on boarding date */
function shouldPollNow(boardingDate: string): boolean {
  const journey = new Date(boardingDate + 'T00:00:00+05:30');
  const now = new Date();
  const diffMs = journey.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  // Stop polling after journey + 24h
  if (diffHours < -24) return false;

  // Day of or day before: always poll (cron is every 30 min)
  if (diffDays <= 1) return true;

  // 2-3 days: every hour (poll every other cron tick)
  if (diffDays <= 3) {
    return new Date().getMinutes() < 30; // only on the :00 tick
  }

  // 4-7 days: every 2 hours
  if (diffDays <= 7) {
    return new Date().getHours() % 2 === 0 && new Date().getMinutes() < 30;
  }

  // 1-2 weeks: every 6 hours
  if (diffDays <= 14) {
    return new Date().getHours() % 6 === 0 && new Date().getMinutes() < 30;
  }

  // > 2 weeks: every 12 hours
  return new Date().getHours() % 12 === 0 && new Date().getMinutes() < 30;
}

/** Fetch PNR status from API */
async function fetchPnrStatus(pnr: string): Promise<PnrApiResponse | null> {
  const apiUrl = Deno.env.get('PNR_API_BASE_URL');
  const apiKey = Deno.env.get('PNR_API_KEY');

  if (!apiUrl || !apiKey) {
    console.error('PNR API not configured');
    return null;
  }

  try {
    const res = await fetch(`${apiUrl}/pnr/${pnr}`, {
      headers: { 'x-api-key': apiKey },
    });

    if (!res.ok) {
      console.error(`PNR API error for ${pnr}: ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error(`PNR fetch failed for ${pnr}:`, err);
    return null;
  }
}

/** Detect status changes and return notification messages */
function detectChanges(
  previous: PnrApiResponse | null,
  current: PnrApiResponse,
  trainInfo: { train_number: string; train_name: string }
): string[] {
  if (!previous) return [];

  const messages: string[] = [];

  // Chart preparation
  if (!previous.chart_prepared && current.chart_prepared) {
    messages.push(`Chart prepared for ${trainInfo.train_number}`);
  }

  // Per-passenger changes
  for (const cp of current.passengers) {
    const pp = previous.passengers.find((p) => p.number === cp.number);
    if (pp && pp.current_status !== cp.current_status) {
      const fromParts = pp.current_status.split('/');
      const toParts = cp.current_status.split('/');

      if (toParts[0] === 'CNF') {
        messages.push(
          `Ticket ${cp.number} moved from ${fromParts[0]}${fromParts[1] ? ' ' + fromParts[1] : ''} to CNF (${toParts[1]}, ${toParts[2]})`
        );
      } else {
        messages.push(
          `Ticket ${cp.number} status: ${pp.current_status} → ${cp.current_status}`
        );
      }
    }
  }

  return messages;
}

/** Send Expo push notifications */
async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: data ?? {},
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('Push notification failed:', err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all tickets with future or recent boarding dates
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1); // include yesterday

    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, pnr, trip_id, train_number, train_name, boarding_date')
      .gte('boarding_date', cutoff.toISOString().split('T')[0]);

    if (ticketsError) throw ticketsError;
    if (!tickets || tickets.length === 0) {
      return new Response(JSON.stringify({ polled: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let polled = 0;
    let notified = 0;

    for (const ticket of tickets as Ticket[]) {
      if (!shouldPollNow(ticket.boarding_date)) continue;

      // Fetch current status
      const currentStatus = await fetchPnrStatus(ticket.pnr);
      if (!currentStatus) continue;

      // Get previous status
      const { data: prevHistory } = await supabase
        .from('pnr_status_history')
        .select('status_data')
        .eq('ticket_id', ticket.id)
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      const previousStatus = prevHistory?.status_data as PnrApiResponse | null;

      // Store new status
      await supabase.from('pnr_status_history').insert({
        ticket_id: ticket.id,
        pnr: ticket.pnr,
        status_data: currentStatus,
      });

      polled++;

      // Detect changes and notify
      const changeMessages = detectChanges(previousStatus, currentStatus, {
        train_number: ticket.train_number,
        train_name: ticket.train_name,
      });

      if (changeMessages.length > 0) {
        // Get all trip members' push tokens
        const { data: members } = await supabase
          .from('trip_members')
          .select('user_id')
          .eq('trip_id', ticket.trip_id);

        if (members && members.length > 0) {
          const userIds = members.map((m: { user_id: string }) => m.user_id);
          const { data: tokens } = await supabase
            .from('device_tokens')
            .select('expo_push_token')
            .in('user_id', userIds);

          if (tokens && tokens.length > 0) {
            const pushTokens = tokens.map(
              (t: { expo_push_token: string }) => t.expo_push_token
            );

            for (const msg of changeMessages) {
              await sendPushNotifications(
                pushTokens,
                `🚂 ${ticket.train_name}`,
                msg,
                { trip_id: ticket.trip_id, ticket_id: ticket.id }
              );
              notified++;
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ polled, notified }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('PNR poll error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
