import { X, House } from "lucide-react";
import EmptyState from "../../common/EmptyState";

import type { ReservationForm } from "../shared/reservation.types";
import type { ParkingSlot } from "../../../data/types";

type SlotState = {
  isDisabled: boolean;
  statusText: string;
  statusClassName: string;
};

interface ParkingSlotPanelProps {
  open: boolean;
  onClose: () => void;
  unitParkingSlots: ParkingSlot[];
  reservationForm: ReservationForm;
  handleSlotSelectFromPanel: (slotId: string) => void;
  getParkingSlotState: (slot: ParkingSlot) => SlotState;
  fallbackImage: string;
}

export default function ParkingSlotPanel({
  open,
  onClose,
  unitParkingSlots,
  reservationForm,
  handleSlotSelectFromPanel,
  getParkingSlotState,
  fallbackImage,
}: ParkingSlotPanelProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-100/80 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Select Your Parking Slot
            </h3>
            <p className="text-sm text-slate-500">
              Choose from the available slots below.
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="rounded-full p-2 text-slate-500 transition hover:bg-white hover:text-slate-800"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {unitParkingSlots.length === 0 ? (
            <EmptyState
              icon={<House className="size-10 text-blue-500" />}
              title="No parking slots found"
              description="There are no parking slots available for this parking area."
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {unitParkingSlots.map((slot) => {
                const slotState = getParkingSlotState(slot);
                const isSelected = reservationForm.slotId === slot.id;
                const isSelectable = !slotState.isDisabled;

                return (
                  <button
                    type="button"
                    key={slot.id}
                    disabled={!isSelectable}
                    onClick={() => handleSlotSelectFromPanel(slot.id)}
                    className={`group relative overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all ${
                      isSelected
                        ? "scale-[1.02] border-blue-600 ring-4 ring-blue-100"
                        : "border-slate-200 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
                    } ${slotState.isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {isSelected && (
                      <div className="absolute right-2 top-2 z-10 rounded-full bg-blue-600 p-1.5 text-white shadow">
                        ✓
                      </div>
                    )}

                    <img
                      src={slot.imageUrl || fallbackImage}
                      alt={slot.slotCode || slot.label || "Parking Slot"}
                      className="h-36 w-full object-cover"
                    />

                    <div className="space-y-3 p-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Parking Slot
                        </p>
                        <h4 className="truncate text-lg font-bold text-slate-900">
                          {slot.slotCode || slot.label || "Parking Slot"}
                        </h4>
                      </div>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${slotState.statusClassName}`}
                      >
                        {slotState.statusText}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}