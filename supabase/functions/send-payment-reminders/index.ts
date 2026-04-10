import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

type ReminderStage = 'three_day' | 'one_day' | 'same_day';

type ReservationRow = {
  reservation_id: string;
  user_id: string;
  public_id: string | null;
  end_date: string;
  total_amount: number | null;
  paid_amount: number | null;
  status: string | null;
  last_payment_reminder_at: string | null;
  last_payment_reminder_stage: string | null;
};

type UserRow = {
  email: string | null;
  first_name: string | null;
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
): ReminderStage | null {
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
  stage: ReminderStage;
}) {
  const { reservationPublicId, remainingBalance, endDate, stage } = params;

  const formattedBalance = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(remainingBalance);

  const formattedEndDate = new Date(endDate).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const title =
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

  return { title, message };
}

function buildReminderEmailHtml(params: {
  firstName?: string | null;
  title: string;
  message: string;
  reservationPublicId: string;
  remainingBalance: number;
  endDate: string;
}) {
  const { firstName, title, message, reservationPublicId, remainingBalance, endDate } = params;

  const formattedBalance = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(remainingBalance);

  const formattedEndDate = new Date(endDate).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const greetingName = firstName?.trim() || 'Valued Client';

  return `
<div style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:32px 16px;background:#eef2f7;">
<tr>
<td align="center">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;margin:0 auto;">
<tr>
<td style="padding:0;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
style="background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">

<!-- Header -->
<tr>
<td style="padding:0;background:#ffffff;border-bottom:1px solid #e2e8f0;">
<table role="presentation" width="100%">

<tr>
<td style="padding:26px 32px 0 32px;">
<table role="presentation">
<tr>

<td style="padding-right:10px;">
<div style="background:#2563eb;padding:8px;border-radius:10px;box-shadow:0 6px 16px rgba(37,99,235,0.15);display:inline-block;">
<img
src="https://nlermulroebcmfwvyhmo.supabase.co/storage/v1/object/public/property_media/public/logos/building-2.png"
width="18"
height="18"
style="display:block;filter:brightness(0) invert(1);"
/>
</div>
</td>

<td>
<div style="font-size:16px;font-weight:700;color:#111827;">
Commerciales Flores
</div>
</td>

</tr>
</table>
</td>
</tr>

<tr>
<td align="center" style="padding:24px 32px 28px 32px;">
<div style="font-size:64px;font-weight:900;color:#f1f5f9;font-style:italic;">
CF
</div>

<div style="margin:-18px auto 18px auto;width:64px;height:64px;background:#2563eb;border-radius:14px;transform:rotate(8deg);box-shadow:0 12px 28px rgba(37,99,235,0.20);display:flex;align-items:center;justify-content:center;">
<img
src="https://nlermulroebcmfwvyhmo.supabase.co/storage/v1/object/public/property_media/public/logos/building-2.png"
width="28"
height="28"
style="display:block;transform:rotate(-8deg);filter:brightness(0) invert(1);"
/>
</div>

<div style="font-size:22px;font-weight:700;color:#111827;margin-bottom:6px;">
${title}
</div>
</td>
</tr>

</table>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:34px 32px;">

<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
Hello ${greetingName},
</p>

<p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#475569;">
${message}
</p>

<table role="presentation" width="100%" style="margin:20px 0;border:1px solid #dbeafe;border-radius:16px;background:#f8fbff;">
<tr>
<td style="padding:18px 20px;">
<div style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#1d4ed8;margin-bottom:8px;">
Reservation summary
</div>

<div style="font-size:14px;line-height:1.8;color:#475569;">
<strong>Reservation:</strong> ${reservationPublicId}<br/>
<strong>End Date:</strong> ${formattedEndDate}<br/>
<strong>Outstanding Balance:</strong> ${formattedBalance}
</div>
</td>
</tr>
</table>

<div style="margin:0 0 18px;padding:18px 20px;border:1px solid #fecaca;border-radius:16px;background:#fff5f5;">
<div style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#dc2626;margin-bottom:8px;">
Payment reminder
</div>
<div style="font-size:14px;line-height:1.8;color:#7f1d1d;">
Please settle your outstanding balance before the reservation end date to avoid interruptions.
</div>
</div>

<p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
Please log in to your account to review and settle your payment.
</p>

</td>
</tr>

<tr>
<td style="padding:22px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
<div style="font-size:12px;line-height:1.8;color:#64748b;text-align:center;">
This is an automated payment reminder from Comerciales Flores.
</div>
</td>
</tr>

</table>

<table role="presentation" width="100%">
<tr>
<td align="center" style="padding:22px 32px;background:#2563eb;border-radius:0 0 22px 22px;">
<div style="font-size:13px;font-weight:600;color:#ffffff;margin-bottom:6px;">
Commerciales Flores
</div>
<div style="font-size:12px;color:#dbeafe;">
© ${new Date().getFullYear()} Commerciales Flores. All rights reserved.
</div>
</td>
</tr>
</table>

</td>
</tr>
</table>

</td>
</tr>
</table>
</div>
`;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    throw new Error('Missing RESEND_API_KEY.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Commerciales Flores <noreply@comercialesflores.com>',
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('PAYMENT_REMINDER_SECRET');

    if (!cronSecret) {
      return jsonResponse(
        { success: false, reason: 'Missing PAYMENT_REMINDER_SECRET.' },
        500
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return jsonResponse(
        { success: false, reason: 'Unauthorized request.' },
        401
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(
        { success: false, reason: 'Missing server configuration.' },
        500
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const now = new Date();
    const nowIso = now.toISOString();

    if (!isWithinReminderHours(now)) {
      return jsonResponse({
        success: true,
        scanned: 0,
        notified: 0,
        emailed: 0,
        skipped: [],
        reason: 'outside_manila_business_hours',
      });
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
    let emailed = 0;

    const skipped: Array<{ reservationId: string; reason: string }> = [];

    for (const reservation of (reservations ?? []) as ReservationRow[]) {
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

      const todayManila = getManilaNowParts(now).dateKey;
      const lastReminderManila = reservation.last_payment_reminder_at
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

      const publicId = reservation.public_id || reservation.reservation_id;

      const { title, message } = buildReminderMessage({
        reservationPublicId: publicId,
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

      notified += 1;

      const { data: userProfile, error: userError } = await supabaseAdmin
        .from('users')
        .select('email, first_name')
        .eq('user_id', reservation.user_id)
        .maybeSingle<UserRow>();

      if (userError) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: `user_lookup_failed:${userError.message}`,
        });
      } else if (!userProfile?.email) {
        skipped.push({
          reservationId: reservation.reservation_id,
          reason: 'missing_email',
        });
      } else {
        try {
          const html = buildReminderEmailHtml({
            firstName: userProfile.first_name,
            title,
            message,
            reservationPublicId: publicId,
            remainingBalance,
            endDate: reservation.end_date,
          });

          await sendEmail({
            to: userProfile.email,
            subject: title,
            html,
          });

          emailed += 1;
        } catch (emailError) {
          console.error(
            `Payment reminder email failed for reservation ${reservation.reservation_id}:`,
            emailError
          );

          skipped.push({
            reservationId: reservation.reservation_id,
            reason:
              emailError instanceof Error
                ? `email_send_failed:${emailError.message}`
                : 'email_send_failed',
          });
        }
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
    }

    return jsonResponse({
      success: true,
      scanned,
      notified,
      emailed,
      skipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return jsonResponse(
      { success: false, reason: message },
      500
    );
  }
});