import { useCallback, useMemo, useState } from 'react';
import { BadgePercent, CalendarClock, Gift, Plus } from 'lucide-react';
import EmptyState from '../../common/EmptyState';
import {
  usePromotions,
  type Promotion,
  type PromotionPayload,
} from '../../../contexts/PromotionsContext';
import PromotionCard from './PromotionCard';
import PromotionModal from './PromotionModal';

export default function AdminPromotions() {
  const {
    promotions,
    loadingPromotions,
    addPromotion,
    updatePromotion,
    deletePromotion,
  } = usePromotions();

  const [showModal, setShowModal] = useState(false);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const editingPromotion = useMemo(
    () => promotions.find((item) => item.id === editingPromotionId) ?? null,
    [promotions, editingPromotionId]
  );

  const activeCount = useMemo(
    () => promotions.filter((promo) => promo.isActive).length,
    [promotions]
  );

  const scheduledOrActiveCount = useMemo(() => {
    const now = new Date();

    return promotions.filter((promo) => {
      if (!promo.isActive) return false;
      if (promo.validUntil && new Date(promo.validUntil) < now) return false;
      return true;
    }).length;
  }, [promotions]);

  const totalRedemptions = useMemo(
    () => promotions.reduce((sum, promo) => sum + Number(promo.usedCount || 0), 0),
    [promotions]
  );

  const handleOpenAdd = useCallback(() => {
    setEditingPromotionId(null);
    setShowModal(true);
  }, []);

  const handleOpenEdit = useCallback((promotionId: string) => {
    setEditingPromotionId(promotionId);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingPromotionId(null);
  }, []);

  const handleSave = useCallback(
    async (payload: PromotionPayload, id?: string) => {
      if (id) {
        await updatePromotion(id, payload);
      } else {
        await addPromotion(payload);
      }
    },
    [addPromotion, updatePromotion]
  );

  const handleToggleActive = useCallback(
    async (promotion: Promotion) => {
      await updatePromotion(promotion.id, {
        code: promotion.code,
        name: promotion.name,
        description: promotion.description,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        appliesToUnitType: promotion.appliesToUnitType,
        appliesToReservationType: promotion.appliesToReservationType,
        minBookingAmount: promotion.minBookingAmount,
        minStayDays: promotion.minStayDays,
        maxUses: promotion.maxUses,
        validFrom: promotion.validFrom,
        validUntil: promotion.validUntil,
        isActive: !promotion.isActive,
      });
    },
    [updatePromotion]
  );

  const handleDelete = useCallback(
    async (promotionId: string) => {
      if (deletingId) return;

      setDeletingId(promotionId);

      try {
        await deletePromotion(promotionId);
      } catch (error) {
        console.error('Failed to delete promotion:', error);
      } finally {
        setDeletingId(null);
      }
    },
    [deletePromotion, deletingId]
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
              Promotions
            </h1>
            <p className="text-sm text-gray-500">
              Manage promo codes, validity windows, usage limits, and discount rules. Attach promos to specific units from the Units page.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95"
          >
            <Plus className="size-5" />
            Add Promotion
          </button>
        </div>

        {!loadingPromotions && promotions.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                  <BadgePercent className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Active Promos
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {activeCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
                  <CalendarClock className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Available / Scheduled
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {scheduledOrActiveCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-violet-100 p-3 text-violet-600">
                  <Gift className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Total Redemptions
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {totalRedemptions}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loadingPromotions ? (
          <EmptyState
            icon={
              <div className="flex items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              </div>
            }
            title="Loading promotions..."
            description="Please wait while promotion settings are being retrieved."
          />
        ) : promotions.length === 0 ? (
          <EmptyState
            icon={<BadgePercent className="size-10 text-blue-500" />}
            title="No promotions configured"
            description="Create your first promo code to offer discounts for eligible reservations."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {promotions.map((promotion) => (
              <PromotionCard
                key={promotion.id}
                promotion={promotion}
                isDeleting={deletingId === promotion.id}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}

        <PromotionModal
          open={showModal}
          promotion={editingPromotion}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}