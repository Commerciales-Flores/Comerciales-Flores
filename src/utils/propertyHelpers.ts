import type { UnitType, PaymentCycle } from '../contexts/DataContext';

export function getUnitTypeLabel(type: UnitType): string {
  switch (type) {
    case 'rental_space':
      return 'Rental Space (Unit)';
    case 'function_hall':
      return 'Function Hall';
    case 'parking_slot':
      return 'Parking Slot';
    default:
      return type;
  }
}

export function getMinimumDuration(type: UnitType): { value: number; unit: string } {
  switch (type) {
    case 'rental_space':
      return { value: 1, unit: 'year' };
    case 'function_hall':
      return { value: 1, unit: 'day' };
    case 'parking_slot':
      return { value: 1, unit: 'month' };
  }
}

export function getPriceLabel(type: UnitType): string {
  switch (type) {
    case 'rental_space':
      return 'per month';
    case 'function_hall':
      return 'per day';
    case 'parking_slot':
      return 'per month';
  }
}

export function calculateTotalAmount(
  type: UnitType,
  price: number,
  duration: number,
  _paymentCycle?: PaymentCycle // underscore avoids unused warning
): number {
  switch (type) {
    case 'rental_space':
      return price * duration;

    case 'function_hall':
      return price * duration;

    case 'parking_slot':
      return price * duration;

    default:
      return price * duration;
  }
}