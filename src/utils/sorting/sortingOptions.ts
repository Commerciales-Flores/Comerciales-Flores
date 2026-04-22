import type {
  UnitSortOption,
  ReservationSortOption,
  PaymentSortOption,
  InquirySortOption,
  CustomerSortOption,
  NotificationSortOption,
  AuditSortOption,
} from "../../data/sorting";  

type SortOption<T extends string> = {
  value: T;
  label: string;
};

export const UNIT_SORT_OPTIONS: SortOption<UnitSortOption>[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Name: A to Z" },
  { value: "name_desc", label: "Name: Z to A" },
  { value: "availability", label: "Availability First" },
];

export const RESERVATION_SORT_OPTIONS: SortOption<ReservationSortOption>[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "start_asc", label: "Reservation Date: Soonest First" },
  { value: "start_desc", label: "Reservation Date: Latest First" },
  { value: "amount_asc", label: "Amount: Low to High" },
  { value: "amount_desc", label: "Amount: High to Low" },
  { value: "property_asc", label: "Property: A to Z" },
  { value: "property_desc", label: "Property: Z to A" },
  { value: "status", label: "Status: Pending First" },
];
export const PAYMENT_SORT_OPTIONS: SortOption<PaymentSortOption>[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "amount_asc", label: "Amount: Low to High" },
  { value: "amount_desc", label: "Amount: High to Low" },
  { value: "method_asc", label: "Method: A to Z" },
  { value: "method_desc", label: "Method: Z to A" },
  { value: "status", label: "Status: Priority Order" },
  
];

export const INQUIRY_SORT_OPTIONS: SortOption<InquirySortOption>[] = [
  { value: "latest_activity", label: "Latest Activity" },
  { value: "oldest", label: "Oldest First" },
  { value: "status", label: "Status: Priority Order" },
];

export const CUSTOMER_SORT_OPTIONS: SortOption<CustomerSortOption>[] = [
  { value: "name_asc", label: "Name: A to Z" },
  { value: "name_desc", label: "Name: Z to A" },
  { value: "recent_login", label: "Last Login: Newest First" },
  { value: "oldest_login", label: "Last Login: Oldest First" },
  { value: "recent_joined", label: "Recently Joined" },
];

export const NOTIFICATION_SORT_OPTIONS: SortOption<NotificationSortOption>[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "unread", label: "Unread First" },
  { value: "type_asc", label: "Type: A to Z" },
];

export const AUDIT_SORT_OPTIONS: SortOption<AuditSortOption>[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'action_asc', label: 'Action: A to Z' },
  { value: 'module_asc', label: 'Module: A to Z' },
  { value: 'performed_by_asc', label: 'Performed By: A to Z' },
];