import type { AuditSortOption } from "../../data/sorting";
import { compareNumbers, compareStrings } from "./sortingHelpers";

type SortableAuditLog = {
  action?: string | null;
  module?: string | null;
  performedBy?: string | null;
  timestampMs?: number | null;
};

export function sortAuditLogs<T extends SortableAuditLog>(
  logs: T[],
  sortBy: AuditSortOption
): T[] {
  const copy = [...logs];

  switch (sortBy) {
    case 'oldest':
      return copy.sort((a, b) =>
        compareNumbers(a.timestampMs, b.timestampMs, 'asc')
      );

    case 'action_asc':
      return copy.sort((a, b) =>
        compareStrings(a.action, b.action, 'asc')
      );

    case 'module_asc':
      return copy.sort((a, b) =>
        compareStrings(a.module, b.module, 'asc')
      );

    case 'performed_by_asc':
      return copy.sort((a, b) =>
        compareStrings(a.performedBy, b.performedBy, 'asc')
      );

    case 'newest':
    default:
      return copy.sort((a, b) =>
        compareNumbers(a.timestampMs, b.timestampMs, 'desc')
      );
  }
}