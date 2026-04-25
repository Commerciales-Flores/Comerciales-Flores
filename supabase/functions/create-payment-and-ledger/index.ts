import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type PaymentMethod =
  | 'gcash'
  | 'bank_transfer'
  | 'credit_card'
  | 'debit_card'
  | null;

type PaymentStatus = 'paid' | 'unpaid';
type PaymentReviewStatus = 'pending' | 'approved' | 'rejected';

type ReservationType =
  | 'flexible_stay'
  | 'monthly_lease'
  | 'function_hall'
  | 'parking'
  | null;

type PaymentCategory =
  | 'reservation_payment'
  | 'advance_deposit'
  | 'security_deposit'
  | 'monthly_rent'
  | 'late_fee'
  | 'payment';

type ReservationRow = {
  reservation_id: string;
  public_id: string | null;
  user_id: string;
  unit_type: string | null;
  reservation_type: ReservationType;
  total_amount: number | string | null;
  amount_due: number | string | null;
  paid_amount: number | string | null;
  subtotal_amount: number | string | null;
  vat_rate: number | string | null;
  vat_amount: number | string | null;
  discount_amount: number | string | null;
  billing_breakdown: Record<string, unknown> | null;
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

function isDepositCategory(category?: PaymentCategory | null) {
  return category === 'advance_deposit' || category === 'security_deposit';
}

function isMonthlyLeaseCategory(category?: PaymentCategory | null) {
  return (
    category === 'reservation_payment' ||
    category === 'advance_deposit' ||
    category === 'security_deposit' ||
    category === 'monthly_rent' ||
    category === 'late_fee' ||
    category === 'payment'
  );
}

function getLedgerMeaningFromCategory(category?: PaymentCategory | null): {
  entryType: 'payment' | 'deposit' | 'penalty';
  depositType?: 'advance' | 'security';
} {
  if (category === 'advance_deposit') {
    return { entryType: 'deposit', depositType: 'advance' };
  }

  if (category === 'security_deposit') {
    return { entryType: 'deposit', depositType: 'security' };
  }

  if (category === 'late_fee') {
    return { entryType: 'penalty' };
  }

  return { entryType: 'payment' };
}

function getPaymentDescription(params: {
  category: PaymentCategory;
  publicId?: string | null;
  paymentId: string;
}) {
  const ref = params.publicId ?? params.paymentId;

  switch (params.category) {
    case 'security_deposit':
      return `Security deposit for ${ref}`;
    case 'advance_deposit':
      return `Advance deposit for ${ref}`;
    case 'monthly_rent':
      return `Monthly rent payment for ${ref}`;
    case 'late_fee':
      return `Late fee payment for ${ref}`;
    case 'reservation_payment':
      return `Reservation payment for ${ref}`;
    case 'payment':
    default:
      return `Payment for reservation ${ref}`;
  }
}

function validatePaymentAmount(params: {
  reservationType: ReservationType;
  category: PaymentCategory;
  submittedAmount: number;
  remaining: number;
}) {
  const submittedAmount = clampMoney(params.submittedAmount);
  const remaining = clampMoney(params.remaining);

  if (remaining <= 0) {
    throw new Error('This reservation is already fully paid.');
  }

  if (submittedAmount > remaining && !isDepositCategory(params.category)) {
    throw new Error('Payment amount cannot exceed the remaining balance.');
  }

  if (
    params.reservationType === 'flexible_stay' ||
    params.reservationType === 'function_hall' ||
    params.reservationType === 'parking'
  ) {
    if (params.category !== 'reservation_payment' && params.category !== 'payment') {
      throw new Error('Invalid payment category for this reservation type.');
    }

    if (submittedAmount < remaining) {
      throw new Error(
        `Full payment is required for this reservation (₱${remaining.toFixed(2)}).`,
      );
    }
  }

  if (params.reservationType === 'monthly_lease') {
    if (!isMonthlyLeaseCategory(params.category)) {
      throw new Error('Invalid payment category for monthly lease.');
    }
  }
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
      category = 'reservation_payment',
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
        reservation_type,
        total_amount,
        amount_due,
        paid_amount,
        subtotal_amount,
        vat_rate,
        vat_amount,
        discount_amount,
        billing_breakdown
      `)
      .eq('reservation_id', effectiveReservationId)
      .maybeSingle<ReservationRow>();

    if (reservationError || !reservation) {
      return json(404, { success: false, error: 'Reservation not found.' });
    }

    const ledgerPaid = await getReservationLedgerNetPaid(
      admin,
      effectiveReservationId,
    );

    const payableTotal = clampMoney(
      Number(reservation.amount_due ?? reservation.total_amount ?? 0),
    );

    const remaining = clampMoney(payableTotal - ledgerPaid);

    try {
      validatePaymentAmount({
        reservationType: reservation.reservation_type,
        category,
        submittedAmount,
        remaining,
      });
    } catch (error) {
      return json(400, {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid payment amount.',
      });
    }

    const paymentDate = new Date().toISOString();

    const billingSnapshot = {
      reservation_type: reservation.reservation_type,
      unit_type: reservation.unit_type,
      subtotal_amount: Number(reservation.subtotal_amount ?? 0),
      vat_rate: Number(reservation.vat_rate ?? 0.12),
      vat_amount: Number(reservation.vat_amount ?? 0),
      discount_amount: Number(reservation.discount_amount ?? 0),
      total_amount: Number(reservation.total_amount ?? 0),
      amount_due: Number(reservation.amount_due ?? reservation.total_amount ?? 0),
      billing_breakdown: reservation.billing_breakdown ?? null,
    };

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
            subtotal_amount: billingSnapshot.subtotal_amount,
            vat_rate: billingSnapshot.vat_rate,
            vat_amount: billingSnapshot.vat_amount,
            discount_amount: billingSnapshot.discount_amount,
            billing_snapshot: billingSnapshot,
          },
        ])
        .select(`
          payment_id,
          public_id,
          reservation_id,
          user_id,
          amount,
          method,
          status,
          review_status,
          proofOfPayment,
          date,
          notes,
          created_at,
          updated_at,
          payment_method_id,
          payment_method_snapshot,
          category,
          subtotal_amount,
          vat_rate,
          vat_amount,
          discount_amount,
          billing_snapshot
        `)
        .single();

      if (insertError) throw insertError;
      finalPaymentRow = inserted;
    } else {
      const { data: existingPayment, error: paymentFetchError } = await admin
        .from('payments')
        .select(`
          payment_id,
          public_id,
          reservation_id,
          user_id,
          amount,
          method,
          status,
          review_status,
          proofOfPayment,
          date,
          notes,
          created_at,
          updated_at,
          payment_method_id,
          payment_method_snapshot,
          category,
          subtotal_amount,
          vat_rate,
          vat_amount,
          discount_amount,
          billing_snapshot
        `)
        .eq('payment_id', paymentId)
        .maybeSingle();

      if (paymentFetchError || !existingPayment) {
        return json(404, { success: false, error: 'Payment not found.' });
      }

      const isApprovingNow =
        existingPayment.review_status !== 'approved' &&
        reviewStatus === 'approved';

      let sanitizedAmount = submittedAmount;

      if (
        existingPayment.status === 'paid' &&
        Number(existingPayment.amount) !== sanitizedAmount
      ) {
        return json(400, {
          success: false,
          error: 'Changing the amount of an already paid payment is not supported.',
        });
      }

      if (existingPayment.status === 'paid' && status !== 'paid') {
        return json(400, {
          success: false,
          error: 'Reverting an already paid payment is not supported.',
        });
      }

      if (isApprovingNow) {
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
          subtotal_amount: billingSnapshot.subtotal_amount,
          vat_rate: billingSnapshot.vat_rate,
          vat_amount: billingSnapshot.vat_amount,
          discount_amount: billingSnapshot.discount_amount,
          billing_snapshot: billingSnapshot,
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', paymentId)
        .select(`
          payment_id,
          public_id,
          reservation_id,
          user_id,
          amount,
          method,
          status,
          review_status,
          proofOfPayment,
          date,
          notes,
          created_at,
          updated_at,
          payment_method_id,
          payment_method_snapshot,
          category,
          subtotal_amount,
          vat_rate,
          vat_amount,
          discount_amount,
          billing_snapshot
        `)
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
              description: getPaymentDescription({
                category,
                publicId: finalPaymentRow.public_id,
                paymentId: finalPaymentRow.payment_id,
              }),
              notes: finalPaymentRow.notes ?? null,
              recorded_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              created_by: user.id,
              subtotal_amount: finalPaymentRow.subtotal_amount,
              vat_rate: finalPaymentRow.vat_rate,
              vat_amount: finalPaymentRow.vat_amount,
              discount_amount: finalPaymentRow.discount_amount,
              billing_snapshot: finalPaymentRow.billing_snapshot,
            },
          ])
          .select('ledger_id, public_id')
          .single();

        if (ledgerError) throw ledgerError;

        await admin.from('audit_log').insert({
          user_id: user.id,
          action: 'LEDGER_ENTRY_CREATED',
          target_table: 'ledger',
          target_id: insertedLedger.ledger_id,
          target_public_id: insertedLedger.public_id ?? null,
          changed_fields: ['amount', 'entry_type', 'billing_snapshot'],
          notes: `Ledger entry created for payment ${finalPaymentRow.public_id}`,
        });
      }

      const netPaid = await getReservationLedgerNetPaid(
        admin,
        finalPaymentRow.reservation_id,
      );

      const reservationPatch: Record<string, unknown> = {
        paid_amount: netPaid,
        updated_at: new Date().toISOString(),
      };

      if (netPaid >= payableTotal) {
        reservationPatch.status = 'confirmed';
      }

      const { error: reservationUpdateError } = await admin
        .from('reservations')
        .update(reservationPatch)
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
          ? ['amount', 'method', 'status', 'review_status', 'billing_snapshot']
          : ['amount', 'method', 'status', 'category', 'billing_snapshot'],
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