import type { CustomerSortOption } from "../../data/sorting";
import {
  compareDates,
  compareStrings,
} from "./sortingHelpers";

type SortableCustomer = {
  first_name?: string | null;
  firstName?: string | null;
  last_name?: string | null;
  lastName?: string | null;
  full_name?: string | null;
  fullName?: string | null;
  email?: string | null;
  created_at?: string | Date | null;
  createdAt?: string | Date | null;
  last_login?: string | Date | null;
  lastLogin?: string | Date | null;
};

const getCustomerFullName = (customer: SortableCustomer) => {
  const explicitFullName = customer.full_name ?? customer.fullName;
  if (explicitFullName?.trim()) return explicitFullName.trim();

  const firstName = (customer.first_name ?? customer.firstName ?? "").trim();
  const lastName = (customer.last_name ?? customer.lastName ?? "").trim();
  const combined = `${firstName} ${lastName}`.trim();

  return combined || customer.email || "";
};

const getCustomerCreatedAt = (customer: SortableCustomer) =>
  customer.created_at ?? customer.createdAt ?? null;

const getCustomerLastLogin = (customer: SortableCustomer) =>
  customer.last_login ?? customer.lastLogin ?? null;

export function sortCustomers<T extends SortableCustomer>(
  customers: T[],
  sortBy: CustomerSortOption
): T[] {
  const copy = [...customers];

  switch (sortBy) {
    case "name_desc":
      return copy.sort((a, b) =>
        compareStrings(getCustomerFullName(a), getCustomerFullName(b), "desc")
      );

    case "recent_login":
      return copy.sort((a, b) =>
        compareDates(getCustomerLastLogin(a), getCustomerLastLogin(b), "desc")
      );

    case "oldest_login":
      return copy.sort((a, b) =>
        compareDates(getCustomerLastLogin(a), getCustomerLastLogin(b), "asc")
      );

    case "recent_joined":
      return copy.sort((a, b) =>
        compareDates(getCustomerCreatedAt(a), getCustomerCreatedAt(b), "desc")
      );

    case "name_asc":
    default:
      return copy.sort((a, b) =>
        compareStrings(getCustomerFullName(a), getCustomerFullName(b), "asc")
      );
  }
}