import type { NotificationSortOption } from "../../data/sorting";
import { compareDates, compareStrings } from "./sortingHelpers";

type SortableNotification = {
  date?: string | null;
  type?: string | null;
  read?: boolean | null;
};

export function sortNotifications<T extends SortableNotification>(
  notifications: T[],
  sortBy: NotificationSortOption
): T[] {
  const copy = [...notifications];

  switch (sortBy) {
    case "oldest":
      return copy.sort((a, b) =>
        compareDates(a.date, b.date, "asc")
      );

    case "unread":
      return copy.sort((a, b) => {
        const readCompare =
          Number(a.read ?? false) - Number(b.read ?? false);

        if (readCompare !== 0) return readCompare;

        return compareDates(b.date, a.date, "asc");
      });

    case "type_asc":
      return copy.sort((a, b) =>
        compareStrings(a.type ?? "", b.type ?? "", "asc")
      );

    case "newest":
    default:
      return copy.sort((a, b) =>
        compareDates(a.date, b.date, "desc")
      );
  }
}