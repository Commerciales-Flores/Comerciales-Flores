import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import supabase from "../supabaseClient";
import { normalizeText } from "../utils/DataNormalization";

export type PromotionDiscountType = "percent" | "fixed";
export type PromotionAppliesToUnitType =
  | "all"
  | "rental_space"
  | "function_hall"
  | "parking_slot";

export type PromotionAppliesToReservationType =
  | "all"
  | "flexible_stay"
  | "monthly_lease"
  | "function_hall"
  | "parking";

export type Promotion = {
  id: string;
  publicId: string | null;
  code: string;
  name: string;
  description: string | null;
  discountType: PromotionDiscountType;
  discountValue: number;
  appliesToUnitType: PromotionAppliesToUnitType;
  appliesToReservationType: PromotionAppliesToReservationType;
  minBookingAmount: number | null;
  minStayDays: number | null;
  maxUses: number | null;
  usedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  attachedUnitIds: string[];
};

export type PromotionPayload = {
  code: string;
  name: string;
  description?: string | null;
  discountType: PromotionDiscountType;
  discountValue: number;
  appliesToUnitType: PromotionAppliesToUnitType;
  appliesToReservationType: PromotionAppliesToReservationType;
  minBookingAmount?: number | null;
  minStayDays?: number | null;
  maxUses?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
};

type PromotionsContextType = {
  promotions: Promotion[];
  activePromotions: Promotion[];
  loadingPromotions: boolean;
  refreshPromotions: () => Promise<void>;
  addPromotion: (payload: PromotionPayload) => Promise<void>;
  updatePromotion: (id: string, payload: PromotionPayload) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
  getPromotionById: (id?: string | null) => Promotion | undefined;
  getPromotionByCode: (code?: string | null) => Promotion | undefined;
  attachPromotionToUnit: (promoId: string, unitId: string) => Promise<void>;
  detachPromotionFromUnit: (promoId: string, unitId: string) => Promise<void>;
};

const PromotionsContext = createContext<PromotionsContextType | undefined>(
  undefined,
);

function normalizePromoCode(value: string) {
  return normalizeText(value).trim().toUpperCase();
}

function normalizeDiscountType(value?: string | null): PromotionDiscountType {
  return value === "fixed" ? "fixed" : "percent";
}

function normalizeUnitType(value?: string | null): PromotionAppliesToUnitType {
  if (
    value === "rental_space" ||
    value === "function_hall" ||
    value === "parking_slot"
  ) {
    return value;
  }

  return "all";
}

function normalizeReservationType(
  value?: string | null,
): PromotionAppliesToReservationType {
  if (
    value === "flexible_stay" ||
    value === "monthly_lease" ||
    value === "function_hall" ||
    value === "parking"
  ) {
    return value;
  }

  return "all";
}

function mapPromotionRow(row: any): Promotion {
  return {
    id: row.promo_id,
    publicId: row.public_id ?? null,
    code: normalizePromoCode(row.code ?? ""),
    name: normalizeText(row.name ?? ""),
    description: row.description ? normalizeText(row.description) : null,
    discountType: normalizeDiscountType(row.discount_type),
    discountValue: Number(row.discount_value ?? 0),
    appliesToUnitType: normalizeUnitType(row.applies_to_unit_type),
    appliesToReservationType: normalizeReservationType(
      row.applies_to_reservation_type,
    ),
    minBookingAmount:
      row.min_booking_amount === null ? null : Number(row.min_booking_amount),
    minStayDays: row.min_stay_days === null ? null : Number(row.min_stay_days),
    maxUses: row.max_uses === null ? null : Number(row.max_uses),
    usedCount: Number(row.used_count ?? 0),
    validFrom: row.valid_from ?? null,
    validUntil: row.valid_until ?? null,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    attachedUnitIds:
      row.unit_promotions?.map((item: any) => item.unit_id) ?? [],
  };
}

function sortPromotions(items: Promotion[]) {
  return [...items].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.code.localeCompare(b.code);
  });
}

function buildPromotionPayload(payload: PromotionPayload) {
  return {
    code: normalizePromoCode(payload.code),
    name: normalizeText(payload.name),
    description: payload.description
      ? normalizeText(payload.description)
      : null,
    discount_type: payload.discountType,
    discount_value: Number(payload.discountValue),
    applies_to_unit_type: payload.appliesToUnitType,
    applies_to_reservation_type: payload.appliesToReservationType,
    min_booking_amount:
      payload.minBookingAmount === undefined ? null : payload.minBookingAmount,
    min_stay_days:
      payload.minStayDays === undefined ? null : payload.minStayDays,
    max_uses: payload.maxUses === undefined ? null : payload.maxUses,
    valid_from: payload.validFrom || null,
    valid_until: payload.validUntil || null,
    is_active: payload.isActive,
  };
}

export function PromotionsProvider({ children }: { children: ReactNode }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(false);

  const refreshPromotions = useCallback(async () => {
    setLoadingPromotions(true);

    try {
      const { data, error } = await supabase
        .from("promotions")
        .select(
          `
        *,
        unit_promotions (
        unit_id
        )
        `,
        )
        .order("is_active", { ascending: false })
        .order("code", { ascending: true });

      if (error) throw error;

      setPromotions(sortPromotions((data ?? []).map(mapPromotionRow)));
    } catch (error) {
      console.error("Failed to fetch promotions:", error);
    } finally {
      setLoadingPromotions(false);
    }
  }, []);

  const attachPromotionToUnit = useCallback(
    async (promoId: string, unitId: string) => {
      const { error: deleteError } = await supabase
        .from("unit_promotions")
        .delete()
        .eq("unit_id", unitId);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("unit_promotions")
        .insert([
          {
            promo_id: promoId,
            unit_id: unitId,
          },
        ]);

      if (insertError) throw insertError;

      await refreshPromotions();
    },
    [refreshPromotions],
  );

  const detachPromotionFromUnit = useCallback(
    async (promoId: string, unitId: string) => {
      const { error } = await supabase
        .from("unit_promotions")
        .delete()
        .eq("promo_id", promoId)
        .eq("unit_id", unitId);

      if (error) throw error;

      await refreshPromotions();
    },
    [refreshPromotions],
  );

  useEffect(() => {
    void refreshPromotions();
  }, [refreshPromotions]);

  useEffect(() => {
    const channel = supabase
      .channel("promotions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "promotions",
        },
        () => {
          void refreshPromotions();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "unit_promotions",
        },
        () => {
          void refreshPromotions();
        },
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log("Promotions realtime status:", status);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshPromotions]);

  const addPromotion = useCallback(async (payload: PromotionPayload) => {
    const dbPayload = buildPromotionPayload(payload);

    const { error } = await supabase.from("promotions").insert([dbPayload]);

    if (error) throw error;
  }, []);

  const updatePromotion = useCallback(
    async (id: string, payload: PromotionPayload) => {
      const dbPayload = {
        ...buildPromotionPayload(payload),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("promotions")
        .update(dbPayload)
        .eq("promo_id", id);

      if (error) throw error;
    },
    [],
  );

  const deletePromotion = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("promotions")
      .delete()
      .eq("promo_id", id);

    if (error) throw error;
  }, []);

  const activePromotions = useMemo(() => {
    const now = new Date();

    return promotions.filter((promo) => {
      if (!promo.isActive) return false;
      if (promo.validFrom && new Date(promo.validFrom) > now) return false;
      if (promo.validUntil && new Date(promo.validUntil) < now) return false;
      if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
        return false;
      }

      return true;
    });
  }, [promotions]);

  const getPromotionById = useCallback(
    (id?: string | null) => promotions.find((item) => item.id === id),
    [promotions],
  );

  const getPromotionByCode = useCallback(
    (code?: string | null) => {
      const normalizedCode = normalizePromoCode(code ?? "");
      return promotions.find((item) => item.code === normalizedCode);
    },
    [promotions],
  );

  const value = useMemo<PromotionsContextType>(
    () => ({
      promotions,
      activePromotions,
      loadingPromotions,
      refreshPromotions,
      addPromotion,
      updatePromotion,
      deletePromotion,
      getPromotionById,
      getPromotionByCode,
      attachPromotionToUnit,
      detachPromotionFromUnit,
    }),
    [
      promotions,
      activePromotions,
      loadingPromotions,
      refreshPromotions,
      addPromotion,
      updatePromotion,
      deletePromotion,
      getPromotionById,
      getPromotionByCode,
      attachPromotionToUnit,
      detachPromotionFromUnit,
    ],
  );

  return (
    <PromotionsContext.Provider value={value}>
      {children}
    </PromotionsContext.Provider>
  );
}

export function usePromotions() {
  const context = useContext(PromotionsContext);

  if (!context) {
    throw new Error("usePromotions must be used within PromotionsProvider");
  }

  return context;
}
