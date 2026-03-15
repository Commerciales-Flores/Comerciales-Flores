import type { UnitType } from '../contexts/DataContext';

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

export function calculateTotalAmount(type: UnitType, price: number, duration: number, paymentCycle?: string): number {
  switch (type) {
    case 'rental_space':
      // Duration is in months, price is monthly
      return price * duration;
    case 'function_hall':
      // Duration is in days, price is daily
      return price * duration;
    case 'parking_slot':
      // Duration is in months, price is monthly
      return price * duration;
    default:
      return price * duration;
  }
}
