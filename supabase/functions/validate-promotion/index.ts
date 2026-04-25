import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type DiscountType = "percent" | "fixed";

type RequestBody = {
  code?: string;
  unitType?: "rental_space" | "function_hall" | "parking_slot";
  reservationType?: "flexible_stay" | "monthly_lease" | "function_hall" | "parking";
  subtotalAmount?: number;
  stayDays?: number | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeCode(value?: string) {
  return String(value ?? "").trim().toUpperCase();
}

function money(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Number(value.toFixed(2)));
}

function calculateDiscount(params: {
  discountType: DiscountType;
  discountValue: number;
  subtotalAmount: number;
}) {
  const subtotal = money(params.subtotalAmount);
  const value = money(params.discountValue);

  if (params.discountType === "percent") {
    return money(subtotal * (value / 100));
  }

  return money(Math.min(value, subtotal));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Length": "0",
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json(401, {
        success: false,
        error: "Unauthorized",
      });
    }

    const body = (await req.json()) as RequestBody;

    const code = normalizeCode(body.code);
    const subtotalAmount = money(Number(body.subtotalAmount ?? 0));
    const stayDays =
      body.stayDays === null || body.stayDays === undefined
        ? null
        : Number(body.stayDays);

    if (!code) {
      return json(400, {
        success: false,
        error: "Promo code is required.",
      });
    }

    if (subtotalAmount <= 0) {
      return json(400, {
        success: false,
        error: "Subtotal amount must be greater than zero.",
      });
    }

    const { data: promo, error: promoError } = await supabase
      .from("promotions")
      .select(`
        promo_id,
        code,
        name,
        description,
        discount_type,
        discount_value,
        applies_to_unit_type,
        applies_to_reservation_type,
        min_booking_amount,
        min_stay_days,
        max_uses,
        used_count,
        valid_from,
        valid_until,
        is_active
      `)
      .eq("code", code)
      .maybeSingle();

    if (promoError) throw promoError;

    if (!promo) {
      return json(404, {
        success: false,
        error: "Promo code was not found.",
      });
    }

    if (!promo.is_active) {
      return json(400, {
        success: false,
        error: "This promo is inactive.",
      });
    }

    const now = new Date();

    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return json(400, {
        success: false,
        error: "This promo is not active yet.",
      });
    }

    if (promo.valid_until && new Date(promo.valid_until) < now) {
      return json(400, {
        success: false,
        error: "This promo has expired.",
      });
    }

    if (
      promo.max_uses !== null &&
      Number(promo.used_count ?? 0) >= Number(promo.max_uses)
    ) {
      return json(400, {
        success: false,
        error: "This promo has reached its usage limit.",
      });
    }

    if (
      promo.applies_to_unit_type !== "all" &&
      promo.applies_to_unit_type !== body.unitType
    ) {
      return json(400, {
        success: false,
        error: "This promo does not apply to this unit type.",
      });
    }

    if (
      promo.applies_to_reservation_type !== "all" &&
      promo.applies_to_reservation_type !== body.reservationType
    ) {
      return json(400, {
        success: false,
        error: "This promo does not apply to this reservation type.",
      });
    }

    if (
      promo.min_booking_amount !== null &&
      subtotalAmount < Number(promo.min_booking_amount)
    ) {
      return json(400, {
        success: false,
        error: `Minimum booking amount is ₱${Number(
          promo.min_booking_amount,
        ).toFixed(2)}.`,
      });
    }

    if (
      promo.min_stay_days !== null &&
      (stayDays === null || stayDays < Number(promo.min_stay_days))
    ) {
      return json(400, {
        success: false,
        error: `Minimum stay is ${promo.min_stay_days} day(s).`,
      });
    }

    const discountAmount = calculateDiscount({
      discountType: promo.discount_type as DiscountType,
      discountValue: Number(promo.discount_value),
      subtotalAmount,
    });

    const taxableSubtotal = money(subtotalAmount - discountAmount);
    const vatRate = 0.12;
    const vatAmount = money(taxableSubtotal * vatRate);
    const totalAmount = money(taxableSubtotal + vatAmount);

    return json(200, {
      success: true,
      promotion: {
        promo_id: promo.promo_id,
        code: promo.code,
        name: promo.name,
        description: promo.description,
        discount_type: promo.discount_type,
        discount_value: Number(promo.discount_value),
      },
      discount_amount: discountAmount,
      taxable_subtotal: taxableSubtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      discount_snapshot: {
        promo_id: promo.promo_id,
        code: promo.code,
        name: promo.name,
        discount_type: promo.discount_type,
        discount_value: Number(promo.discount_value),
        discount_amount: discountAmount,
        validated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("validate-promotion error:", error);

    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error",
    });
  }
});