import { type PropertyType, propertyTypes } from "./catalog";

export type DiscoveryFilters = {
  location: string;
  propertyType: PropertyType | "";
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  minArea: string;
  maxArea: string;
};

export const emptyDiscoveryFilters: DiscoveryFilters = {
  location: "",
  propertyType: "",
  minPrice: "",
  maxPrice: "",
  bedrooms: "",
  minArea: "",
  maxArea: "",
};

function numberFilter(value: unknown, allowFraction = false) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const normalized = String(value).trim();
  const pattern = allowFraction ? /^\d+(\.\d+)?$/ : /^\d+$/;
  const number = Number(normalized);
  return pattern.test(normalized) && number <= Number.MAX_SAFE_INTEGER
    ? String(number)
    : "";
}

export function validateDiscoverySearch(
  search: Record<string, unknown>,
): DiscoveryFilters {
  return {
    location: typeof search.location === "string" ? search.location.trim() : "",
    propertyType:
      propertyTypes.find((type) => type === search.propertyType) ?? "",
    minPrice: numberFilter(search.minPrice),
    maxPrice: numberFilter(search.maxPrice),
    bedrooms: numberFilter(search.bedrooms),
    minArea: numberFilter(search.minArea, true),
    maxArea: numberFilter(search.maxArea, true),
  };
}
