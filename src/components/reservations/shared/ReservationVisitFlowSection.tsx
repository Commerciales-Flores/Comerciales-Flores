import { Check, ChevronDown } from "lucide-react";
import React from "react";
import type {
  PaymentIntent,
  ReservationForm,
  VisitMode,
} from "./reservation.types";

interface ReservationVisitFlowSectionProps {
  reservationForm: ReservationForm;
  setReservationForm: React.Dispatch<React.SetStateAction<ReservationForm>>;
  handleModeChange: (mode: VisitMode) => void;
  appointmentTimeOptions: string[];
  formatTimeLabel: (value: string) => string;
  getDateInputValue: (date?: Date) => string;
  formErrors: Record<string, string>;
  isTimeSelectOpen: boolean;
  setIsTimeSelectOpen: React.Dispatch<React.SetStateAction<boolean>>;
  timeSelectRef: React.RefObject<HTMLDivElement>;
  isViewingOnly: boolean;
}

export default function ReservationVisitFlowSection({
  reservationForm,
  setReservationForm,
  handleModeChange,
  appointmentTimeOptions,
  formatTimeLabel,
  getDateInputValue,
  formErrors,
  isTimeSelectOpen,
  setIsTimeSelectOpen,
  timeSelectRef,
  isViewingOnly,
}: ReservationVisitFlowSectionProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        How do you want to proceed?
      </label>

      <select
        value={reservationForm.modeOfVisit}
        onChange={(e) => handleModeChange(e.target.value as VisitMode)}
        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        <option value="online">Reserve Online</option>
        <option value="onsite">Visit On-site First</option>
      </select>

      {reservationForm.modeOfVisit === "onsite" && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Appointment Date
            </label>

            <input
              type="date"
              value={getDateInputValue(reservationForm.appointmentDate)}
              min={getDateInputValue(new Date())}
              onChange={(e) =>
                setReservationForm((prev) => ({
                  ...prev,
                  appointmentDate: e.target.value
                    ? new Date(`${e.target.value}T00:00:00`)
                    : undefined,
                }))
              }
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            {formErrors.appointmentDate && (
              <p className="mt-1 text-xs text-red-600">
                {formErrors.appointmentDate}
              </p>
            )}
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Appointment Time
            </label>

            <div className="relative" ref={timeSelectRef}>
              <button
                type="button"
                onClick={() => setIsTimeSelectOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2 text-left text-sm sm:text-base outline-none transition hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <span
                  className={
                    reservationForm.appointmentTime
                      ? "text-gray-900"
                      : "text-gray-400"
                  }
                >
                  {reservationForm.appointmentTime
                    ? formatTimeLabel(reservationForm.appointmentTime)
                    : "Select appointment time"}
                </span>

                <ChevronDown
                  className={`size-4 text-blue-500 transition-transform ${
                    isTimeSelectOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isTimeSelectOpen && (
                <div className="absolute z-30 mt-2 max-h-64 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                  <div className="max-h-64 overflow-y-auto py-1">
                    {appointmentTimeOptions.map((time) => {
                      const isSelected =
                        reservationForm.appointmentTime === time;

                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            setReservationForm((prev) => ({
                              ...prev,
                              appointmentTime: time,
                            }));
                            setIsTimeSelectOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                            isSelected
                              ? "bg-blue-50 font-medium text-blue-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span>{formatTimeLabel(time)}</span>
                          {isSelected ? <Check className="size-4" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Available visiting hours: 9:00 AM to 5:00 PM
            </p>

            {formErrors.appointmentTime && (
              <p className="mt-1 text-xs text-red-600">
                {formErrors.appointmentTime}
              </p>
            )}
          </div>

          <label className="mt-6 mb-2 block text-sm font-medium text-gray-700">
            What is the goal of your visit?
          </label>

          <div className="space-y-2">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                reservationForm.paymentIntent === "pay_later"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="paymentIntent"
                value="pay_later"
                checked={reservationForm.paymentIntent === "pay_later"}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    paymentIntent: e.target.value as PaymentIntent,
                  }))
                }
                className="mt-1 size-4 text-blue-600 focus:ring-blue-500"
              />

              <div>
                <p className="text-sm font-medium text-gray-900">
                  Book Viewing Only
                </p>
                <p className="text-xs text-gray-500">
                  I want to tour the unit first. No payment is required for the
                  visit.
                </p>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                reservationForm.paymentIntent === "pay_onsite"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <input
                type="radio"
                name="paymentIntent"
                value="pay_onsite"
                checked={reservationForm.paymentIntent === "pay_onsite"}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    paymentIntent: e.target.value as PaymentIntent,
                  }))
                }
                className="mt-1 size-4 text-blue-600 focus:ring-blue-500"
              />

              <div>
                <p className="text-sm font-medium text-gray-900">
                  Reserve with On-site Visit
                </p>
                <p className="text-xs text-gray-500">
                  Submit a reservation request and complete the visit onsite.
                  Approval is still required before payment is finalized.
                </p>
              </div>
            </label>
          </div>

          {formErrors.paymentIntent && (
            <p className="mt-2 text-xs text-red-600">
              {formErrors.paymentIntent}
            </p>
          )}

          {isViewingOnly && (
            <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-3 text-sm text-green-800">
              Viewing only selected. No payment method is required for this
              appointment.
            </div>
          )}
        </div>
      )}
    </div>
  );
}