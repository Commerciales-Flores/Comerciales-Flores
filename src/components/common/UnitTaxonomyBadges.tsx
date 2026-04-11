import React from "react";

type Props = {
  category?: string | null;
  subtype?: string | null;
  size?: "sm" | "md";
  className?: string;
};

function formatTaxonomyLabel(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCategoryBadgeClass(category?: string | null) {
  switch (category) {
    case "commercial_space":
      return "border border-blue-200 bg-blue-50 text-blue-700";
    case "residential_space":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "function_room":
      return "border border-violet-200 bg-violet-50 text-violet-700";
    case "parking":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border border-slate-200 bg-slate-100 text-slate-600";
  }
}

export default function UnitTaxonomyBadges({
  category,
  subtype,
  size = "sm",
  className = "",
}: Props) {
  if (!category && !subtype) return null;

  const baseSize =
    size === "md"
      ? "px-2.5 py-1 text-[11px]"
      : "px-2 py-0.5 text-[10px]";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {category && (
        <span
          className={`rounded-full font-semibold ${baseSize} ${getCategoryBadgeClass(
            category
          )}`}
        >
          {formatTaxonomyLabel(category)}
        </span>
      )}

      {subtype && (
        <span
          className={`rounded-full border border-slate-200 bg-white/90 font-semibold text-slate-700 ${baseSize}`}
        >
          {formatTaxonomyLabel(subtype)}
        </span>
      )}
    </div>
  );
}