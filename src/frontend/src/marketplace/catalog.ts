export const propertyTypes = [
  "Apartment",
  "House",
  "Villa",
  "Commercial",
  "Land",
] as const;

export type PropertyType = (typeof propertyTypes)[number];
export type PropertyStatus = "available" | "pending" | "sold" | "draft";

export interface PropertyCoordinates {
  latitude: number;
  longitude: number;
}

export interface PropertyListing {
  id: string;
  title: string;
  description: string;
  type: PropertyType;
  price: number;
  neighborhood: string;
  city: string;
  address: string;
  areaM2: number;
  bedrooms?: number;
  bathrooms?: number;
  livingAreaM2?: number;
  rooms?: number;
  floor?: number;
  totalFloors?: number;
  builtYear?: number;
  condition?: string;
  buildingType?: string;
  coordinates?: PropertyCoordinates;
  images: string[];
  imageDescriptions?: string[];
  featured?: boolean;
  status: PropertyStatus;
  listedAt: string;
  amenities: string[];
  priceHistory?: { price: number; date: string }[];
  source?: {
    provider: "myhome";
    id: string;
    url: string;
    facts?: { label: string; value: string }[];
  };
  seller: {
    name: string;
    role: string;
    email?: string;
    phone?: string;
  };
}

const priceFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const areaFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatPrice(price: number) {
  return priceFormat.format(price);
}

export function formatArea(areaM2: number) {
  return `${areaFormat.format(areaM2)} m²`;
}

export function formatLocation(
  listing: Pick<PropertyListing, "neighborhood" | "city">,
) {
  return [listing.neighborhood, listing.city].filter(Boolean).join(", ");
}
