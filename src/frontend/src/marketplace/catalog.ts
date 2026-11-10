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
  demo?: boolean;
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

const portfolio = {
  city: "Tbilisi",
  demo: true,
  status: "available",
  seller: { name: "Sample listing", role: "Demo portfolio" },
} as const;

export const sampleListings: PropertyListing[] = [
  {
    ...portfolio,
    id: "vake-villa",
    title: "The Vake Residence",
    description:
      "A contemporary hillside residence organized around an open terrace and pool. Floor-to-ceiling glazing brings afternoon light into the living spaces, while the upper level offers four bedrooms and a quieter outlook over the neighborhood. A covered terrace extends the dining area outdoors.",
    type: "Villa",
    price: 845_000,
    neighborhood: "Vake",
    address: "Vake Park area",
    areaM2: 320,
    livingAreaM2: 268,
    bedrooms: 4,
    bathrooms: 3,
    rooms: 7,
    totalFloors: 2,
    builtYear: 2022,
    buildingType: "Detached residence",
    condition: "Move-in ready",
    coordinates: { latitude: 41.7124, longitude: 44.7546 },
    images: ["/assets/properties/vake-villa.webp"],
    imageDescriptions: [
      "A glass and concrete villa beside a pool, with a wooded hillside beyond",
    ],
    featured: true,
    listedAt: "2026-10-30",
    amenities: [
      "Pool",
      "Garden",
      "Terrace",
      "Covered parking",
      "Underfloor heating",
    ],
  },
  {
    ...portfolio,
    id: "vera-apartment",
    title: "A Quiet Corner in Vera",
    description:
      "Tall windows, warm oak and a restrained palette give this two-bedroom apartment an easy sense of calm. The main living space opens to a balcony overlooking the neighborhood. A separate study makes room for working from home.",
    type: "Apartment",
    price: 285_000,
    neighborhood: "Vera",
    address: "Vera Park area",
    areaM2: 118,
    livingAreaM2: 106,
    bedrooms: 2,
    bathrooms: 2,
    rooms: 4,
    floor: 4,
    totalFloors: 6,
    builtYear: 2015,
    buildingType: "Apartment building",
    condition: "Renovated",
    coordinates: { latitude: 41.7093, longitude: 44.7824 },
    images: ["/assets/properties/vera-apartment.webp"],
    imageDescriptions: [
      "A living room with a linen sofa, oak dining table and tall windows",
    ],
    featured: true,
    listedAt: "2026-11-02",
    amenities: ["Balcony", "Elevator", "Study", "Built-in storage"],
  },
  {
    ...portfolio,
    id: "mtatsminda-house",
    title: "The Hillside House",
    description:
      "A hillside home with stonework, terracotta and sheltered outdoor spaces. Three bedrooms occupy the upper floor, and the main living area opens to a south-facing terrace with views toward the old city.",
    type: "House",
    price: 465_000,
    neighborhood: "Mtatsminda",
    address: "Mtatsminda lower slopes",
    areaM2: 214,
    livingAreaM2: 182,
    bedrooms: 3,
    bathrooms: 2,
    rooms: 5,
    totalFloors: 2,
    builtYear: 2019,
    buildingType: "Detached house",
    condition: "Move-in ready",
    coordinates: { latitude: 41.6965, longitude: 44.7882 },
    images: ["/assets/properties/mtatsminda-house.webp"],
    imageDescriptions: [
      "A stone and terracotta house with carved balcony posts and a wooded hill behind it",
    ],
    featured: true,
    listedAt: "2026-10-26",
    amenities: ["Terrace", "Courtyard", "Fireplace", "City views"],
  },
  {
    ...portfolio,
    id: "saburtalo-apartment",
    title: "A Light-Filled Apartment",
    description:
      "An efficient one-bedroom layout with an open kitchen and a sunny living room. The full-width balcony is accessible from both the bedroom and the living space.",
    type: "Apartment",
    price: 172_000,
    neighborhood: "Saburtalo",
    address: "Delisi area",
    areaM2: 76,
    livingAreaM2: 68,
    bedrooms: 1,
    bathrooms: 1,
    rooms: 2,
    floor: 6,
    totalFloors: 10,
    builtYear: 2023,
    buildingType: "Apartment building",
    condition: "Move-in ready",
    coordinates: { latitude: 41.7251, longitude: 44.7519 },
    images: ["/assets/properties/saburtalo-apartment.webp"],
    imageDescriptions: [
      "An apartment living room opening onto a balcony overlooking the city",
    ],
    listedAt: "2026-11-06",
    amenities: ["Balcony", "Elevator", "Covered parking"],
  },
  {
    ...portfolio,
    id: "chugureti-loft",
    title: "A Studio Behind the Avenue",
    description:
      "An adaptable street-level commercial space with an open floor plan, tall windows and exposed brick. The layout leaves room for a showroom, studio or small office, with storage and a kitchenette at the back.",
    type: "Commercial",
    price: 235_000,
    neighborhood: "Chugureti",
    address: "Marjanishvili area",
    areaM2: 142,
    bathrooms: 1,
    rooms: 2,
    floor: 0,
    buildingType: "Mixed-use building",
    condition: "Renovated",
    coordinates: { latitude: 41.7087, longitude: 44.8011 },
    images: ["/assets/properties/chugureti-loft.webp"],
    imageDescriptions: [
      "An open loft with exposed brick, timber beams and arched windows",
    ],
    listedAt: "2026-10-19",
    amenities: ["Street entrance", "High ceilings", "Kitchenette", "Storage"],
  },
  {
    ...portfolio,
    id: "krtsanisi-land",
    title: "A Plot Above the Valley",
    description:
      "A gently sloping parcel on the edge of Krtsanisi with an open outlook over the valley. The plot has road access along its upper edge and mature vegetation around part of the perimeter.",
    type: "Land",
    price: 198_000,
    neighborhood: "Krtsanisi",
    address: "Krtsanisi hillside",
    areaM2: 820,
    coordinates: { latitude: 41.6719, longitude: 44.8195 },
    images: ["/assets/properties/krtsanisi-land.webp"],
    imageDescriptions: [
      "A grassy plot overlooking a valley with houses and distant hills",
    ],
    listedAt: "2026-10-22",
    amenities: ["Road access", "Valley views"],
  },
];
