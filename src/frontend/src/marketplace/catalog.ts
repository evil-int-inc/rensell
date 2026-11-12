import { getLanguage, getLocale, translate } from "@/i18n";

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

const formats = new Map<
  string,
  { price: Intl.NumberFormat; area: Intl.NumberFormat }
>();

function numberFormats() {
  const locale = getLanguage() === "en" ? "en-US" : getLocale();
  let format = formats.get(locale);
  if (!format) {
    format = {
      price: new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
      area: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
    };
    formats.set(locale, format);
  }
  return format;
}

export function formatPrice(price: number) {
  return numberFormats().price.format(price);
}

export function formatArea(areaM2: number) {
  return translate("{area} m²", { area: numberFormats().area.format(areaM2) });
}

export function formatLocation(
  listing: Pick<PropertyListing, "neighborhood" | "city">,
) {
  return [listing.neighborhood, listing.city].filter(Boolean).join(", ");
}
