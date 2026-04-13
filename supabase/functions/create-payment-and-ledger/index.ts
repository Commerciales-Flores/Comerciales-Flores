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

type PaymentStatus = 'paid' | 'partial' | 'unpaid';
type PaymentReviewStatus = 'pending' | 'approved' | 'rejected';
type PaymentCycle = 'monthly' | 'quarterly' | 'full' | null;
type PaymentCategory = 'payment' | 'advance_deposit' | 'security_deposit';

type ReservationRow = {
  reservation_id: string;
  public_id: string | null;
  user_id: string;
  unit_type: string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  duration: number | null;
  minimum_payment_percent_snapshot: number | null;
  details: {
    paymentCycle?: PaymentCycle;
  } | null;
};

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

function allowsPartialPayments(unitType?: string | null) {
  return unitType === 'function_hall' || unitType === 'parking_slot';
}

function getMinimumPaymentPercent(reservation: {
  minimum_payment_percent_snapshot?: number | null;
}) {
  const value = Number(reservation.minimum_payment_percent_snapshot ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function getMinimumRequiredAmount(params: {
  totalAmount: number;
  paidAmount: number;
  minimumPaymentPercentSnapshot?: number | null;
}) {
  const totalAmount = clampMoney(params.totalAmount);
  const paidAmount = clampMoney(params.paidAmount);
  const remaining = clampMoney(totalAmount - paidAmount);
  const minimumPercent = getMinimumPaymentPercent({
    minimum_payment_percent_snapshot: params.minimumPaymentPercentSnapshot,
  });

  if (minimumPercent <= 0) {
    return {
      minimumPercent: 0,
      minimumRequired: 0,
      remaining,
      isFirstPayment: paidAmount <= 0,
    };
  }

  const rawMinimum = clampMoney((totalAmount * minimumPercent) / 100);

  return {
    minimumPercent,
    minimumRequired: Math.min(rawMinimum, remaining),
    remaining,
    isFirstPayment: paidAmount <= 0,
  };
}

function validateMinimumFirstPayment(params: {
  totalAmount: number;
  paidAmount: number;
  minimumPaymentPercentSnapshot?: number | null;
}) {
  return (amount: number) => {
    const submittedAmount = clampMoney(amount);
    const { minimumPercent, minimumRequired, isFirstPayment } =
      getMinimumRequiredAmount(params);

    if (!isFirstPayment || minimumPercent <= 0) return;

    if (submittedAmount < minimumRequired) {
      throw new Error(
        `First payment must be at least ${minimumPercent}% of the total amount (₱${minimumRequired.toFixed(
          2,
        )}).`,
      );
    }
  };
}

function validateScheduledSubsequentPayment(params: {
  unitType?: string | null;
  totalAmount: number;
  paidAmount: number;
  duration?: number | null;
  paymentCycle?: PaymentCycle | null;
}) {
  return (amount: number) => {
    const submittedAmount = clampMoney(amount);
    const paidAmount = clampMoney(params.paidAmount);
    const totalAmount = clampMoney(params.totalAmount);
    const remaining = clampMoney(totalAmount - paidAmount);
    const isFirstPayment = paidAmount <= 0;

    if (remaining <= 0) return;

    const isPartialAllowed = allowsPartialPayments(params.unitType);

    if (isPartialAllowed) {
      if (isFirstPayment) return;

      const minimumRequired = Math.min(remaining, totalAmount * 0.05);

      if (submittedAmount < minimumRequired) {
        throw new Error(
          `Subsequent payments must be at least ₱${minimumRequired.toFixed(2)}.`,
        );
      }

      return;
    }

    const duration = Math.max(1, Number(params.duration ?? 1));
    const cycle: PaymentCycle = params.paymentCycle ?? 'monthly';
    const monthlyAmount = duration > 0 ? totalAmount / duration : totalAmount;

    let minimumRequired = 0;

    if (cycle === 'monthly') {
      minimumRequired = monthlyAmount;
    } else if (cycle === 'quarterly') {
      minimumRequired = monthlyAmount * 3;
    } else if (cycle === 'full') {
      minimumRequired = remaining;
    }

    minimumRequired = Math.min(clampMoney(minimumRequired), remaining);

    if (minimumRequired <= 0) return;

    if (submittedAmount < minimumRequired) {
      if (cycle === 'full') {
        throw new Error(
          `Full payment is required for this rental reservation (₱${minimumRequired.toFixed(
            2,
          )}).`,
        );
      }

      throw new Error(
        `${
          cycle === 'quarterly' ? 'Quarterly' : 'Monthly'
        } rental payments must be at least ₱${minimumRequired.toFixed(2)}.`,
      );
    }
  };
}

function isDepositCategory(category?: PaymentCategory | null) {
  return category === 'advance_deposit' || category === 'security_deposit';
}

function getLedgerMeaningFromCategory(category?: PaymentCategory | null): {
  entryType: 'payment' | 'deposit';
  depositType?: 'advance' | 'security';
} {
  if (category === 'advance_deposit') {
    return { entryType: 'deposit', depositType: 'advance' };
  }
  if (category === 'security_deposit') {
    return { entryType: 'deposit', depositType: 'security' };
  }
  return { entryType: 'payment' };
}

async function getReservationLedgerNetPaid(
  admin: ReturnType<typeof createClient>,
  effectiveReservationId: string,
) {
  const { data, error } = await admin
    .from('ledger')
    .select('entry_type, deposit_type, amount')
    .eq('reservation_id', effectiveReservationId);

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
  return new Response(null, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Length': '0',
    },
  });
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

    const body = await req.json();

    const {
      effectiveReservationId: bodyReservationId,
      amount,
      method,
      status,
      reviewStatus = 'pending', 
      proofOfPayment = null,
      notes = null,
      paymentMethodId = null,
      paymentMethodSnapshot = null,
      category = 'payment',
      paymentId = null,
    }: {
      effectiveReservationId: string | null;
      amount: number;
      method: PaymentMethod;
      status: PaymentStatus;
      reviewStatus?: PaymentReviewStatus;
      proofOfPayment?: string | null;
      notes?: string | null;
      paymentMethodId?: string | null;
      paymentMethodSnapshot?: Record<string, unknown> | null;
      category?: PaymentCategory;
      paymentId?: string | null;
    } = body;

let effectiveReservationId = bodyReservationId;

    if (!effectiveReservationId && paymentId) {
      const { data: existing } = await admin
        .from('payments')
        .select('reservation_id')
        .eq('payment_id', paymentId)
        .maybeSingle();

      effectiveReservationId = existing?.reservation_id ?? null;
    }

    if (!effectiveReservationId) {
      return json(400, { success: false, error: 'Reservation is required.' });
    }

    const submittedAmount = clampMoney(Number(amount));
    if (submittedAmount <= 0) {
      return json(400, {
        success: false,
        error: 'Payment amount must be greater than zero.',
      });
    }

    const { data: reservation, error: reservationError } = await admin
      .from('reservations')
      .select(`
        reservation_id,
        public_id,
        user_id,
        unit_type,
        total_amount,
        paid_amount,
        duration,
        minimum_payment_percent_snapshot,
        details
      `)
      .eq('reservation_id', effectiveReservationId)
      .maybeSingle<ReservationRow>();

    if (reservationError || !reservation) {
      return json(404, { success: false, error: 'Reservation not found.' });
    }

    const depositPayment = isDepositCategory(category);
    const ledgerPaid = await getReservationLedgerNetPaid(admin, effectiveReservationId);
    const remaining = clampMoney(Number(reservation.total_amount) - ledgerPaid);

    if (!depositPayment && submittedAmount > remaining) {
      return json(400, {
        success: false,
        error: 'Payment amount cannot exceed the remaining balance.',
      });
    }

    if (!depositPayment) {
  const isRentalSpace = reservation.unit_type === 'rental_space';

  const enforceMinimumFirstPayment = validateMinimumFirstPayment({
    totalAmount: Number(reservation.total_amount),
    paidAmount: ledgerPaid,
    minimumPaymentPercentSnapshot:
      reservation.minimum_payment_percent_snapshot,
  });

  const enforceScheduledSubsequentPayment = validateScheduledSubsequentPayment({
    unitType: reservation.unit_type,
    totalAmount: Number(reservation.total_amount),
    paidAmount: ledgerPaid,
    duration: reservation.duration,
    paymentCycle: reservation.details?.paymentCycle ?? null,
  });

  // Rental spaces should follow their billing cycle rules,
  // not the generic minimum first payment snapshot rule.
  if (!isRentalSpace) {
    enforceMinimumFirstPayment(submittedAmount);
  }

  enforceScheduledSubsequentPayment(submittedAmount);
}

    const paymentDate = new Date().toISOString();

    let finalPaymentRow: any;

    if (!paymentId) {
      const { data: inserted, error: insertError } = await admin
        .from('payments')
        .insert([
          {
            user_id: reservation.user_id,
            reservation_id: effectiveReservationId,
            amount: submittedAmount,
            method,
            status,
            review_status: reviewStatus,
            proofOfPayment,
            date: paymentDate,
            notes,
            payment_method_id: paymentMethodId,
            payment_method_snapshot: paymentMethodSnapshot,
            category,
          },
        ])
        .select(
          'payment_id, public_id, reservation_id, user_id, amount, method, status, review_status, proofOfPayment, date, notes, created_at, updated_at, payment_method_id, payment_method_snapshot, category',
        )
        .single();

      if (insertError) throw insertError;
      finalPaymentRow = inserted;
    } else {
      const { data: existingPayment, error: paymentFetchError } = await admin
        .from('payments')
        .select(
          'payment_id, public_id, reservation_id, user_id, amount, method, status, review_status, proofOfPayment, date, notes, created_at, updated_at, payment_method_id, payment_method_snapshot, category',
        )
        .eq('payment_id', paymentId)
        .maybeSingle();

      if (paymentFetchError || !existingPayment) {
        return json(404, { success: false, error: 'Payment not found.' });
      }

      const isApprovingNow =
        existingPayment.review_status !== 'approved' && reviewStatus === 'approved';

      let sanitizedAmount = submittedAmount;

      if (
        existingPayment.status === 'paid' &&
        Number(existingPayment.amount) !== sanitizedAmount
      ) {
        return json(400, {
          success: false,
          error:
            'Changing the amount of an already paid payment is not supported.',
        });
      }

      if (existingPayment.status === 'paid' && status !== 'paid') {
        return json(400, {
          success: false,
          error: 'Reverting an already paid payment is not supported.',
        });
      }

      if (isApprovingNow && !depositPayment) {
        if (remaining <= 0) {
          return json(400, {
            success: false,
            error: 'This reservation is already fully paid.',
          });
        }

        sanitizedAmount = Math.min(submittedAmount, remaining);
      }

      const { data: updated, error: updateError } = await admin
        .from('payments')
        .update({
          amount: sanitizedAmount,
          method,
          status,
          review_status: reviewStatus,
          proofOfPayment,
          notes,
          payment_method_id: paymentMethodId,
          payment_method_snapshot: paymentMethodSnapshot,
          category,
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', paymentId)
        .select(
          'payment_id, public_id, reservation_id, user_id, amount, method, status, review_status, proofOfPayment, date, notes, created_at, updated_at, payment_method_id, payment_method_snapshot, category',
        )
        .single();

      if (updateError) throw updateError;
      finalPaymentRow = updated;
    }

    if (finalPaymentRow.review_status === 'approved') {
      const { data: existingLedger, error: existingLedgerError } = await admin
        .from('ledger')
        .select('ledger_id')
        .eq('payment_id', finalPaymentRow.payment_id)
        .limit(1)
        .maybeSingle();

      if (existingLedgerError) throw existingLedgerError;

      if (!existingLedger) {
  const { entryType, depositType } = getLedgerMeaningFromCategory(category);

  const { data: insertedLedger, error: ledgerError } = await admin
    .from('ledger')
    .insert([
      {
        user_id: finalPaymentRow.user_id,
        reservation_id: finalPaymentRow.reservation_id,
        payment_id: finalPaymentRow.payment_id,
        entry_type: entryType,
        deposit_type: depositType ?? null,
        amount: finalPaymentRow.amount,
        method: finalPaymentRow.method,
        status: 'verified',
        reference_no: null,
        description:
          category === 'security_deposit'
            ? `Security deposit for ${finalPaymentRow.public_id ?? finalPaymentRow.payment_id}`
            : category === 'advance_deposit'
            ? `Advance deposit for ${finalPaymentRow.public_id ?? finalPaymentRow.payment_id}`
            : `Payment for reservation ${finalPaymentRow.public_id ?? finalPaymentRow.payment_id}`,
        notes: finalPaymentRow.notes ?? null,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        created_by: user.id,
      },
    ])
    .select('ledger_id, public_id') // 🔥 IMPORTANT
    .single();

  if (ledgerError) throw ledgerError;

  // ✅ Audit log for ledger
  await admin.from('audit_log').insert({
    user_id: user.id,
    action: 'LEDGER_ENTRY_CREATED',
    target_table: 'ledger',
    target_id: insertedLedger.ledger_id,
    target_public_id: insertedLedger.public_id ?? null,
    changed_fields: ['amount', 'entry_type'],
    notes: `Ledger entry created for payment ${finalPaymentRow.public_id}`,
  });
}

      const netPaid = await getReservationLedgerNetPaid(
        admin,
        finalPaymentRow.reservation_id,
      );

      const { error: reservationUpdateError } = await admin
        .from('reservations')
        .update({
          paid_amount: netPaid,
          updated_at: new Date().toISOString(),
        })
        .eq('reservation_id', finalPaymentRow.reservation_id);

      if (reservationUpdateError) throw reservationUpdateError;
    }

    const auditAction = paymentId
    ? reviewStatus === 'approved'
      ? 'PAYMENT_APPROVED'
      : reviewStatus === 'rejected'
      ? 'PAYMENT_REJECTED'
      : 'PAYMENT_UPDATED'
    : 'PAYMENT_CREATED';

    await admin.from('audit_log').insert([
      {
        user_id: user.id,
        action: auditAction,
        target_table: 'payments',
        target_id: finalPaymentRow.payment_id,
        target_public_id: finalPaymentRow.public_id ?? null,
        changed_fields: paymentId
          ? ['amount', 'method', 'status']
          : ['amount', 'method', 'status', 'category'],
        timestamp: new Date().toISOString(),
        notes: paymentId
          ? `Processed ${category} ${finalPaymentRow.public_id} for reservation ${reservation.public_id}`
          : `Created ${category} ${finalPaymentRow.public_id} for reservation ${reservation.public_id}`,
      },
    ]);

    return json(200, {
      success: true,
      payment: finalPaymentRow,
    });
  } catch (error) {
    console.error('create-payment-and-ledger error:', error);
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
    });
  }
});