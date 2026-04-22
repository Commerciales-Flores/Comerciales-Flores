export const compareStrings = (
  a?: string | null,
  b?: string | null,
  direction: "asc" | "desc" = "asc"
) => {
  const left = (a || "").trim().toLowerCase();
  const right = (b || "").trim().toLowerCase();
  const result = left.localeCompare(right);
  return direction === "asc" ? result : -result;
};

export const compareNumbers = (
  a?: number | null,
  b?: number | null,
  direction: "asc" | "desc" = "asc"
) => {
  const left = Number(a || 0);
  const right = Number(b || 0);
  const result = left - right;
  return direction === "asc" ? result : -result;
};

export const compareDates = (
  a?: string | Date | null,
  b?: string | Date | null,
  direction: "asc" | "desc" = "asc"
) => {
  const left = a ? new Date(a).getTime() : 0;
  const right = b ? new Date(b).getTime() : 0;
  const result = left - right;
  return direction === "asc" ? result : -result;
};

export const compareBooleans = (
  a?: boolean | null,
  b?: boolean | null,
  trueFirst = true
) => {
  const left = Boolean(a);
  const right = Boolean(b);

  if (left === right) return 0;
  if (trueFirst) return left ? -1 : 1;
  return left ? 1 : -1;
};