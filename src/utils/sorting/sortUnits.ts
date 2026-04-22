import type { UnitSortOption } from "../../data/sorting";
import { compareBooleans, compareNumbers, compareStrings } from "../sorting/sortingHelpers"

type SortableUnit = {
  title?: string | null;
  unitName?: string | null;
  price?: number | null;
  isAvailable?: boolean | null;
  availableSlots?: number | null;
};

export function sortUnits<T extends SortableUnit>(units: T[], sortBy: UnitSortOption): T[] {
  const copy = [...units];

  switch (sortBy) {
    case "price_asc":
      return copy.sort((a, b) => compareNumbers(a.price, b.price, "asc"));

    case "price_desc":
      return copy.sort((a, b) => compareNumbers(a.price, b.price, "desc"));

    case "name_asc":
      return copy.sort((a, b) =>
        compareStrings(a.title || a.unitName, b.title || b.unitName, "asc")
      );

    case "name_desc":
      return copy.sort((a, b) =>
        compareStrings(a.title || a.unitName, b.title || b.unitName, "desc")
      );

    case "availability":
      return copy.sort((a, b) => {
        const availabilityCompare = compareBooleans(a.isAvailable, b.isAvailable, true);
        if (availabilityCompare !== 0) return availabilityCompare;
        return compareNumbers(a.price, b.price, "asc");
      });

    case "recommended":
    default:
      return copy.sort((a, b) => {
        const availabilityCompare = compareBooleans(a.isAvailable, b.isAvailable, true);
        if (availabilityCompare !== 0) return availabilityCompare;

        const slotCompare = compareNumbers(b.availableSlots, a.availableSlots, "asc");
        if (slotCompare !== 0) return slotCompare;

        return compareNumbers(a.price, b.price, "asc");
      });
  }
}