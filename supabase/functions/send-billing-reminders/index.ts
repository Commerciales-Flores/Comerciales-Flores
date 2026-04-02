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
    <div style="margin:0;padding:0;background:#f8fafc;">
      <div style="max-width:640px;margin:0 auto;padding:32px 20px;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
          <div style="background:#0f172a;padding:24px 28px;">
            <p style="margin:0;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#93c5fd;font-weight:700;">
              Comerciales Flores
            </p>
            <h1 style="margin:10px 0 0;font-size:24px;line-height:1.3;color:#ffffff;">
              ${title}
            </h1>
          </div>

          <div style="padding:28px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
              Hello ${greetingName},
            </p>

            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
              ${plainMessage}
            </p>

            <div style="margin:24px 0;padding:18px;border:1px solid #dbeafe;background:#eff6ff;border-radius:16px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;">
                Billing Summary
              </p>
              <p style="margin:0 0 6px;font-size:14px;color:#0f172a;">
                <strong>Reservation:</strong> ${publicId}
              </p>
              <p style="margin:0 0 6px;font-size:14px;color:#0f172a;">
                <strong>Billing Cycle:</strong> ${cycleLabel}
              </p>
              <p style="margin:0 0 6px;font-size:14px;color:#0f172a;">
                <strong>Due Date:</strong> ${formattedDueDate}
              </p>
              <p style="margin:0;font-size:14px;color:#0f172a;">
                <strong>Remaining Balance:</strong> ${formattedBalance}
              </p>
            </div>

            <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#475569;">
              Please log in to your account to review and settle your payment.
            </p>

            <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
              This is an automated billing reminder from Comerciales Flores.
            </p>
          </div>
        </div>
      </div>
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
      from: 'Comerciales Flores <noreply@comercialesflores.com>',
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