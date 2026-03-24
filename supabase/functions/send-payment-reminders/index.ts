import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getRemainingBalance(totalAmount: number | null, paidAmount: number | null) {
  return Math.max(Number(totalAmount || 0) - Number(paidAmount || 0), 0);
}

function getManilaNowParts(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    dateKey: `${map.year}-${map.month}-${map.day}`,
  };
}

function isWithinReminderHours(now = new Date()) {
  const { hour } = getManilaNowParts(now);
  return hour >= 8 && hour < 20;
}

function getReminderStage(
  endDateIso: string,
  now = new Date()
): 'three_day' | 'one_day' | 'same_day' | null {
  const manilaNow = getManilaNowParts(now);
  const manilaEnd = getManilaNowParts(new Date(endDateIso));

  const todayUtc = Date.UTC(manilaNow.year, manilaNow.month - 1, manilaNow.day);
  const endUtc = Date.UTC(manilaEnd.year, manilaEnd.month - 1, manilaEnd.day);

  const diffDays = Math.floor((endUtc - todayUtc) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;
  if (diffDays === 0) return 'same_day';
  if (diffDays === 1) return 'one_day';
  if (diffDays <= 3) return 'three_day';

  return null;
}

function buildReminderMessage(params: {
  reservationPublicId: string;
  remainingBalance: number;
  endDate: string;
  stage: 'three_day' | 'one_day' | 'same_day';
}) {
  const { reservationPublicId, remainingBalance, endDate, stage } = params;

  const formattedBalance = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(remainingBalance);

  const formattedEndDate = new Date(endDate).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const prefix =
    stage === 'three_day'
      ? 'Payment Reminder'
      : stage === 'one_day'
      ? 'Upcoming Payment Due'
      : 'Final Payment Reminder';

  const message =
    stage === 'three_day'
      ? `Your reservation ${reservationPublicId} will end on ${formattedEndDate} and still has an outstanding balance of ${formattedBalance}. Please settle your payment before the reservation end date.`
      : stage === 'one_day'
      ? `Your reservation ${reservationPublicId} will end within 1 day and still has an outstanding balance of ${formattedBalance}. Please settle your payment as soon as possible.`
      : `Your reservation ${reservationPublicId} ends today and still has an outstanding balance of ${formattedBalance}. Please settle your payment before the reservation period ends.`;

  return { title: prefix, message };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('PAYMENT_REMINDER_SECRET');

    if (!cronSecret) {
      return new Response(
        JSON.stringify({ success: false, reason: 'Missing PAYMENT_REMINDER_SECRET.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ success: false, reason: 'Unauthorized request.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, reason: 'Missing server configuration.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const now = new Date();
    const nowIso = now.toISOString();

    if (!isWithinReminderHours(now)) {
      return new Response(
        JSON.stringify({
          success: true,
          scanned: 0,
          notified: 0,
          skipped: [],
          reason: 'outside_manila_business_hours',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: reservations, error: reservationsError } = await supabaseAdmin
      .from('reservations')
      .select(`
        reservation_id,
        user_id,
        public_id,
        end_date,
        total_amount,
        paid_amount,
        status,
        last_payment_reminder_at,
        last_payment_reminder_stage
      `)
      .eq('status', 'confirmed')
      .not('end_date', 'is', null);

    if (reservationsError) {
      throw reservationsError;
    }

    let scanned = 0;
    let notified = 0;
    const skipped: Array<{ reservationId: string; reason: string }> = [];

    for (const reservation of reservations ?? []) {
      scanned += 1;

      const remainingBalance = getRemainingBalance(
        reservation.total_amount,
        reservation.paid_amount
      );

      if (remainingBalance <= 0) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: 'fully_paid',
        });
        continue;
      }

            const stage = getReminderStage(reservation.end_date, now);
      if (!stage) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: 'outside_reminder_window',
        });
        continue;
      }

            const todayManila = getManilaNowParts().dateKey;
      const lastReminderManila =
        reservation.last_payment_reminder_at
          ? getManilaNowParts(new Date(reservation.last_payment_reminder_at)).dateKey
          : null;

      if (
        reservation.last_payment_reminder_stage === stage &&
        lastReminderManila === todayManila
      ) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: `already_sent_${stage}_today`,
        });
        continue;
      }

      const { title, message } = buildReminderMessage({
        reservationPublicId: reservation.public_id,
        remainingBalance,
        endDate: reservation.end_date,
        stage,
      });

      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: reservation.user_id,
          title,
          message,
          type: 'payment',
          is_read: false,
          date: nowIso,
        });

      if (notificationError) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: `notification_insert_failed:${notificationError.message}`,
        });
        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from('reservations')
        .update({
          last_payment_reminder_at: nowIso,
          last_payment_reminder_stage: stage,
          updated_at: nowIso,
        })
        .eq('reservation_id', reservation.reservation_id);

      if (updateError) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: `reminder_tracking_update_failed:${updateError.message}`,
        });
        continue;
      }

      notified += 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned,
        notified,
        skipped,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return new Response(
      JSON.stringify({ success: false, reason: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});