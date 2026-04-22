export type BaseSortDirection = "asc" | "desc";

export type UnitSortOption =
  | "recommended"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc"
  | "availability";

  export type AuditSortOption =
  | 'newest'
  | 'oldest'
  | 'action_asc'
  | 'module_asc'
  | 'performed_by_asc';

export type ReservationSortOption =
  | "newest"
  | "oldest"
  | "start_asc"
  | "start_desc"
  | "amount_asc"
  | "amount_desc"
  | "property_asc"
  | "property_desc"
  | "status";

  export type NotificationSortOption =
  | "newest"
  | "oldest"
  | "unread"
  | "type_asc";

export type PaymentSortOption =
  | "newest"
  | "oldest"
  | "amount_asc"
  | "amount_desc"
  | "method_asc"
  | "method_desc"
  | "status";

export type InquirySortOption =
  | "latest_activity"
  | "oldest"
  | "status";

export type CustomerSortOption =
  | "name_asc"
  | "name_desc"
  | "recent_login"
  | "oldest_login"
  | "recent_joined";