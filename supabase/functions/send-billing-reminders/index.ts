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

type BillingStage = 'upcoming' | 'due' | 'overdue';
type BillingType = 'monthly' | 'quarterly' | 'full' | null;

type ReservationRow = {
  reservation_id: string;
  user_id: string;
  public_id: string | null;
  start_date: string | null;
  end_date: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  details: {
    paymentCycle?: BillingType;
  } | null;
  last_billing_reminder_at: string | null;
  last_billing_reminder_stage: string | null;
  last_billing_due_date: string | null;
  last_billing_cycle_type: string | null;
};

type UserRow = {
  email: string | null;
  first_name: string | null;
};

function getManilaParts(date = new Date()) {
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

  const parts = formatter.formatToParts(date);
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

function getManilaDateKey(date = new Date()) {
  return getManilaParts(date).dateKey;
}

function isWithinBusinessHours(date = new Date()) {
  const { hour } = getManilaParts(date);
  return hour >= 8 && hour < 20;
}

function getRemainingBalance(totalAmount: number | null, paidAmount: number | null) {
  return Math.max(Number(totalAmount || 0) - Number(paidAmount || 0), 0);
}

function addMonthsSafe(date: Date, months: number) {
  const result = new Date(date);
  const originalDay = result.getDate();

  result.setMonth(result.getMonth() + months);

  if (result.getDate() < originalDay) {
    result.setDate(0);
  }

  return result;
}

function getBillingType(details: ReservationRow['details']): BillingType {
  const value = details?.paymentCycle;
  if (value === 'monthly' || value === 'quarterly' || value === 'full') {
    return value;
  }
  return null;
}

function getNextDueDate(
  startDateIso: string,
  billingType: Exclude<BillingType, null | 'full'>,
  now = new Date()
) {
  const intervalMonths = billingType === 'monthly' ? 1 : 3;
  let dueDate = new Date(startDateIso);

  while (dueDate.getTime() < now.getTime()) {
    dueDate = addMonthsSafe(dueDate, intervalMonths);
  }

  return dueDate;
}

function getBillingStage(dueDate: Date, now = new Date()): BillingStage | null {
  const manilaNow = getManilaParts(now);
  const manilaDue = getManilaParts(dueDate);

  const todayUtc = Date.UTC(manilaNow.year, manilaNow.month - 1, manilaNow.day);
  const dueUtc = Date.UTC(manilaDue.year, manilaDue.month - 1, manilaDue.day);
  const diffDays = Math.floor((dueUtc - todayUtc) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'due';
  if (diffDays <= 3) return 'upcoming';
  return null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function formatDueDate(date: Date) {
  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildReminderContent(params: {
  firstName?: string | null;
  publicId: string;
  billingType: 'monthly' | 'quarterly';
  stage: BillingStage;
  dueDate: Date;
  remainingBalance: number;
}) {
  const { firstName, publicId, billingType, stage, dueDate, remainingBalance } = params;

  const formattedBalance = formatCurrency(remainingBalance);
  const formattedDueDate = formatDueDate(dueDate);
  const cycleLabel = billingType === 'monthly' ? 'monthly' : 'quarterly';

  const title =
    stage === 'overdue'
      ? 'Overdue Billing Payment'
      : stage === 'due'
      ? 'Billing Payment Due Today'
      : 'Upcoming Billing Payment Due';

  const plainMessage =
    stage === 'overdue'
      ? `Your ${cycleLabel} billing payment for reservation ${publicId} is overdue. Remaining balance: ${formattedBalance}.`
      : stage === 'due'
      ? `Your ${cycleLabel} billing payment for reservation ${publicId} is due today. Remaining balance: ${formattedBalance}.`
      : `Your ${cycleLabel} billing payment for reservation ${publicId} is due on ${formattedDueDate}. Remaining balance: ${formattedBalance}.`;

  const greetingName = firstName?.trim() || 'Valued Client';

  const html = `
<div style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:32px 16px;background:#eef2f7;">
<tr>
<td align="center">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;margin:0 auto;">
<tr>
<td style="padding:0;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
style="background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">

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

<tr>
<td style="padding:34px 32px;">

<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
Hello ${greetingName},
</p>

<p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#475569;">
${plainMessage}
</p>

<table role="presentation" width="100%" style="margin:20px 0;border:1px solid #dbeafe;border-radius:16px;background:#f8fbff;">
<tr>
<td style="padding:18px 20px;">
<div style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#1d4ed8;margin-bottom:8px;">
Billing summary
</div>

<div style="font-size:14px;line-height:1.8;color:#475569;">
<strong>Reservation:</strong> ${publicId}<br/>
<strong>Billing Cycle:</strong> ${cycleLabel}<br/>
<strong>Due Date:</strong> ${formattedDueDate}<br/>
<strong>Remaining Balance:</strong> ${formattedBalance}
</div>
</td>
</tr>
</table>

<div style="margin:0 0 18px;padding:18px 20px;border:1px solid #fecaca;border-radius:16px;background:#fff5f5;">
<div style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#dc2626;margin-bottom:8px;">
Billing reminder
</div>
<div style="font-size:14px;line-height:1.8;color:#7f1d1d;">
Please settle your payment before the due date to avoid interruptions.
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
This is an automated billing reminder from Commerciales Flores.
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

  return {
    title,
    message: plainMessage,
    html,
  };
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
    const cronSecret = Deno.env.get('BILLING_REMINDER_SECRET');

    if (!cronSecret) {
      return jsonResponse({ success: false, reason: 'Missing BILLING_REMINDER_SECRET.' }, 500);
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return jsonResponse({ success: false, reason: 'Unauthorized.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, reason: 'Missing server configuration.' }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();
    const nowIso = now.toISOString();
    const todayKey = getManilaDateKey(now);

    if (!isWithinBusinessHours(now)) {
      return jsonResponse({
        success: true,
        scanned: 0,
        notified: 0,
        emailed: 0,
        skipped: [],
        reason: 'outside_business_hours',
      });
    }

    const { data: reservations, error } = await admin
      .from('reservations')
      .select(`
        reservation_id,
        user_id,
        public_id,
        start_date,
        end_date,
        total_amount,
        paid_amount,
        details,
        last_billing_reminder_at,
        last_billing_reminder_stage,
        last_billing_due_date,
        last_billing_cycle_type
      `)
      .eq('status', 'confirmed');

    if (error) {
      throw error;
    }

    let scanned = 0;
    let notified = 0;
    let emailed = 0;

    const skipped: Array<{ reservationId: string; reason: string }> = [];

    for (const rawReservation of (reservations ?? []) as ReservationRow[]) {
      scanned += 1;

      const reservationId = rawReservation.reservation_id;
      const publicId = rawReservation.public_id || rawReservation.reservation_id;
      const billingType = getBillingType(rawReservation.details);

      if (!billingType || billingType === 'full') {
        skipped.push({
          reservationId,
          reason: 'not_recurring',
        });
        continue;
      }

      if (!rawReservation.start_date) {
        skipped.push({
          reservationId,
          reason: 'missing_start_date',
        });
        continue;
      }

      const remainingBalance = getRemainingBalance(
        rawReservation.total_amount,
        rawReservation.paid_amount
      );

      if (remainingBalance <= 0) {
        skipped.push({
          reservationId,
          reason: 'fully_paid',
        });
        continue;
      }

      const dueDate = getNextDueDate(rawReservation.start_date, billingType, now);
      const stage = getBillingStage(dueDate, now);

      if (!stage) {
        skipped.push({
          reservationId,
          reason: 'not_in_window',
        });
        continue;
      }

      const dueDateIso = dueDate.toISOString();
      const dueDateKey = getManilaDateKey(dueDate);

      const lastReminderManila =
        rawReservation.last_billing_reminder_at
          ? getManilaDateKey(new Date(rawReservation.last_billing_reminder_at))
          : null;

      const lastDueDateKey =
        rawReservation.last_billing_due_date
          ? getManilaDateKey(new Date(rawReservation.last_billing_due_date))
          : null;

      if (
        rawReservation.last_billing_reminder_stage === stage &&
        rawReservation.last_billing_cycle_type === billingType &&
        lastReminderManila === todayKey &&
        lastDueDateKey === dueDateKey
      ) {
        skipped.push({
          reservationId,
          reason: `already_sent_${stage}_today`,
        });
        continue;
      }

      const { data: userProfile, error: userError } = await admin
        .from('users')
        .select('email, first_name')
        .eq('user_id', rawReservation.user_id)
        .maybeSingle<UserRow>();

      if (userError) {
        skipped.push({
          reservationId,
          reason: `user_lookup_failed:${userError.message}`,
        });
        continue;
      }

      if (!userProfile?.email) {
        skipped.push({
          reservationId,
          reason: 'missing_email',
        });
        continue;
      }

      const reminder = buildReminderContent({
        firstName: userProfile.first_name,
        publicId,
        billingType,
        stage,
        dueDate,
        remainingBalance,
      });

      const { error: notificationError } = await admin
        .from('notifications')
        .insert({
          user_id: rawReservation.user_id,
          title: reminder.title,
          message: reminder.message,
          type: 'billing',
          is_read: false,
          date: nowIso,
        });

      if (notificationError) {
        skipped.push({
          reservationId,
          reason: `notification_insert_failed:${notificationError.message}`,
        });
        continue;
      }

      notified += 1;

      try {
        await sendEmail({
          to: userProfile.email,
          subject: reminder.title,
          html: reminder.html,
        });
        emailed += 1;
      } catch (emailError) {
        console.error(`Billing email failed for reservation ${reservationId}:`, emailError);
      }

      const { error: updateError } = await admin
        .from('reservations')
        .update({
          last_billing_reminder_at: nowIso,
          last_billing_reminder_stage: stage,
          last_billing_due_date: dueDateIso,
          last_billing_cycle_type: billingType,
          updated_at: nowIso,
        })
        .eq('reservation_id', reservationId);

      if (updateError) {
        skipped.push({
          reservationId,
          reason: `billing_tracking_update_failed:${updateError.message}`,
        });
      }
    }

    return jsonResponse({
      success: true,
      scanned,
      notified,
      emailed,
      skipped,
    });
  } catch (err) {
    return jsonResponse(
      {
        success: false,
        reason: err instanceof Error ? err.message : 'Unknown error',
      },
      500
    );
  }
});