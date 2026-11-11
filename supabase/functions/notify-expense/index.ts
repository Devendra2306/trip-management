// Supabase Edge Function: Send push notification for new expenses
// Called via database webhook or direct invocation

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { expense_id, trip_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get expense details
    const { data: expense } = await supabase
      .from('expenses')
      .select('*, profiles!paid_by(display_name)')
      .eq('id', expense_id)
      .single();

    if (!expense) {
      return new Response(JSON.stringify({ error: 'Expense not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get shares to find involved users
    const { data: shares } = await supabase
      .from('expense_shares')
      .select('user_id')
      .eq('expense_id', expense_id);

    if (!shares || shares.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get push tokens for involved users (excluding the creator)
    const userIds = shares
      .map((s: { user_id: string }) => s.user_id)
      .filter((uid: string) => uid !== expense.created_by);

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('expo_push_token')
      .in('user_id', userIds);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pushTokens = tokens.map(
      (t: { expo_push_token: string }) => t.expo_push_token
    );

    const payerName =
      (expense.profiles as { display_name: string })?.display_name ?? 'Someone';
    const amountRupees = (expense.amount / 100).toFixed(0);
    const body = `${payerName} added "${expense.title}" — ₹${amountRupees}`;

    // Send push notifications
    const messages = pushTokens.map((token: string) => ({
      to: token,
      sound: 'default',
      title: '💰 New Expense',
      body,
      data: { trip_id, expense_id },
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    return new Response(
      JSON.stringify({ notified: pushTokens.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Expense notify error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
