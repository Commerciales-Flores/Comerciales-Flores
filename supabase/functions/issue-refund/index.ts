import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type PaymentMethod =
  | 'cash'
  | 'gcash'
  | 'bank_transfer'
  | 'credit_card'
  | 'debit_card'
  | 'other'
  | null;

type PaymentCategory = 'payment' | 'advance_deposit' | 'security_deposit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function clampMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Number(value));
}

async function getReservationLedgerNetPaid(
  admin: ReturnType<typeof createClient>,
  reservationId: string,
) {
  const { data, error } = await admin
    .from('ledger')
    .select('entry_type, deposit_type, amount')
    .eq('reservation_id', reservationId);

  if (error) throw error;

  let paid = 0;
  let refunds = 0;
  let discounts = 0;
  let penalties = 0;
  let adjustments = 0;

  for (const row of data ?? []) {
    const amount = Number(row.amount ?? 0);

    switch (row.entry_type) {
      case 'payment':
      case 'balance':
        paid += amount;
        break;
      case 'deposit':
        if (row.deposit_type === 'advance') paid += amount;
        break;
      case 'refund':
        refunds += amount;
        break;
      case 'discount':
        discounts += amount;
        break;
      case 'penalty':
        penalties += amount;
        break;
      case 'adjustment':
        adjustments += amount;
        break;
    }
  }

  return Math.max(0, paid - refunds - discounts + penalties + adjustments);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return json(401, { success: false, error: 'Unauthorized' });
    }

    const {
      reservationId,
      paymentId = null,
      amount,
      method = null,
      notes = null,
      referenceNo = null,
    }: {
      reservationId: string;
      paymentId?: string | null;
      amount: number;
      method?: PaymentMethod | null;
      notes?: string | null;
      referenceNo?: string | null;
    } = await req.json();

    const refundAmount = clampMoney(Number(amount));

    if (!reservationId) {
      return json(400, { success: false, error: 'Reservation is required.' });
    }

    if (refundAmount <= 0) {
      return json(400, {
        success: false,
        error: 'Refund amount must be greater than zero.',
      });
    }

    const { data: reservation, error: reservationError } = await admin
      .from('reservations')
      .select('reservation_id, public_id, user_id')
      .eq('reservation_id', reservationId)
      .maybeSingle();

    if (reservationError || !reservation) {
      return json(404, { success: false, error: 'Reservation not found.' });
    }

    let linkedPayment: any = null;
    let refundableLimit = 0;

    if (paymentId) {
      const { data: payment, error: paymentError } = await admin
        .from('payments')
        .select('payment_id, public_id, reservation_id, amount, method, status, category')
        .eq('payment_id', paymentId)
        .maybeSingle();

      if (paymentError || !payment) {
        return json(404, { success: false, error: 'Linked payment not found.' });
      }

      if (payment.reservation_id !== reservationId) {
        return json(400, {
          success: false,
          error: 'The selected payment does not belong to this reservation.',
        });
      }

      if (payment.status !== 'paid') {
        return json(400, {
          success: false,
          error: 'Only approved payments can be refunded.',
        });
      }

      linkedPayment = payment;

      const { data: refundRows, error: refundRowsError } = await admin
        .from('ledger')
        .select('amount')
        .eq('reservation_id', reservationId)
        .eq('payment_id', paymentId)
        .eq('entry_type', 'refund');

      if (refundRowsError) throw refundRowsError;

      const alreadyRefunded = (refundRows ?? []).reduce(
        (sum, row) => sum + Number(row.amount ?? 0),
        0,
      );

      refundableLimit = Math.max(0, Number(payment.amount) - alreadyRefunded);

      if (refundableLimit <= 0) {
        return json(400, {
          success: false,
          error: 'This payment has already been fully refunded.',
        });
      }

      if (refundAmount > refundableLimit) {
        return json(400, {
          success: false,
          error:
            `Refund cannot exceed the remaining refundable amount for this payment (₱${refundableLimit.toFixed(2)}).`,
        });
      }
    } else {
      const netPaid = await getReservationLedgerNetPaid(admin, reservationId);

      if (netPaid <= 0) {
        return json(400, {
          success: false,
          error: 'No refundable balance available.',
        });
      }

      refundableLimit = netPaid;

      if (refundAmount > refundableLimit) {
        return json(400, {
          success: false,
          error: `Refund cannot exceed ₱${refundableLimit.toFixed(2)}.`,
        });
      }
    }

    const linkedCategory = (linkedPayment?.category ?? 'payment') as PaymentCategory;

    const description = linkedPayment
      ? linkedCategory === 'security_deposit'
        ? `Refund for security deposit ${linkedPayment.public_id ?? linkedPayment.payment_id}`
        : linkedCategory === 'advance_deposit'
        ? `Refund for advance deposit ${linkedPayment.public_id ?? linkedPayment.payment_id}`
        : `Refund for payment ${linkedPayment.public_id ?? linkedPayment.payment_id}`
      : `Refund for reservation ${reservation.public_id ?? reservation.reservation_id}`;

    const { error: ledgerError } = await admin.from('ledger').insert([
      {
        user_id: reservation.user_id,
        reservation_id: reservationId,
        payment_id: paymentId ?? null,
        entry_type: 'refund',
        deposit_type:
          linkedCategory === 'security_deposit'
            ? 'security'
            : linkedCategory === 'advance_deposit'
            ? 'advance'
            : null,
        amount: refundAmount,
        method: method ?? linkedPayment?.method ?? null,
        status: 'verified',
        reference_no: referenceNo,
        description,
        notes,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        created_by: user.id,
      },
    ]);

    if (ledgerError) throw ledgerError;

    const netPaid = await getReservationLedgerNetPaid(admin, reservationId);

    const { error: reservationUpdateError } = await admin
      .from('reservations')
      .update({
        paid_amount: netPaid,
        updated_at: new Date().toISOString(),
      })
      .eq('reservation_id', reservationId);

    if (reservationUpdateError) throw reservationUpdateError;

    await admin.from('audit_log').insert([
      {
        user_id: user.id,
        action: 'PAYMENT_REFUNDED',
        target_table: 'payments',
        target_id: paymentId ?? reservationId,
        target_public_id: linkedPayment?.public_id ?? reservation.public_id ?? null,
        changed_fields: ['refund'],
        timestamp: new Date().toISOString(),
        notes: linkedPayment
          ? `Issued refund of ₱${refundAmount.toFixed(2)} for ${linkedCategory} ${linkedPayment.public_id ?? linkedPayment.payment_id}`
          : `Issued refund of ₱${refundAmount.toFixed(2)} for reservation ${reservation.public_id ?? reservation.reservation_id}`,
      },
    ]);

    return json(200, { success: true });
  } catch (error) {
    console.error('issue-refund error:', error);
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
    });
  }
});