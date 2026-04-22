import type { InquirySortOption } from "../../data/sorting";
import {
  compareDates,
  compareStrings,
} from "./sortingHelpers";

type SortableInquiry = {
  created_at?: string | Date | null;
  createdAt?: string | Date | null;
  updated_at?: string | Date | null;
  updatedAt?: string | Date | null;
  last_message_at?: string | Date | null;
  lastMessageAt?: string | Date | null;
  subject?: string | null;
  status?: string | null;
};

const INQUIRY_STATUS_PRIORITY: Record<string, number> = {
  waiting_for_support: 1,
  waiting_for_customer: 2,
  open: 3,
  resolved: 4,
  closed: 5,
};

const getInquiryLatestActivity = (inquiry: SortableInquiry) =>
  inquiry.last_message_at ??
  inquiry.lastMessageAt ??
  inquiry.updated_at ??
  inquiry.updatedAt ??
  inquiry.created_at ??
  inquiry.createdAt ??
  null;

const getInquiryOldestDate = (inquiry: SortableInquiry) =>
  inquiry.created_at ?? inquiry.createdAt ?? null;

const getInquiryStatusRank = (inquiry: SortableInquiry) => {
  const status = String(inquiry.status || "")
    .trim()
    .toLowerCase();

  return INQUIRY_STATUS_PRIORITY[status] ?? 999;
};

export function sortInquiries<T extends SortableInquiry>(
  inquiries: T[],
  sortBy: InquirySortOption
): T[] {
  const copy = [...inquiries];

  switch (sortBy) {
    case "oldest":
      return copy.sort((a, b) =>
        compareDates(getInquiryOldestDate(a), getInquiryOldestDate(b), "asc")
      );

    case "status":
      return copy.sort((a, b) => {
        const statusCompare = getInquiryStatusRank(a) - getInquiryStatusRank(b);
        if (statusCompare !== 0) return statusCompare;

        return compareDates(getInquiryLatestActivity(a), getInquiryLatestActivity(b), "desc");
      });

    case "latest_activity":
    default:
      return copy.sort((a, b) => {
        const activityCompare = compareDates(
          getInquiryLatestActivity(a),
          getInquiryLatestActivity(b),
          "desc"
        );
        if (activityCompare !== 0) return activityCompare;

        return compareStrings(a.subject, b.subject, "asc");
      });
  }
}