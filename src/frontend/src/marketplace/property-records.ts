import type { PropertyRecord } from "@/backend";
import { type PropertyListing, propertyTypes } from "./catalog";
import { readMyHomeSource } from "./myhome-import";

const pageSize = 4;
const recordByteLimit = 480_000;

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function decodeSource(
  source: PropertyListing["source"],
): PropertyListing["source"] {
  if (source?.provider !== "myhome" || typeof source.url !== "string")
    return undefined;
  const matched = readMyHomeSource(source.url);
  if (!matched || matched.id !== source.id) return undefined;

  const facts = Array.isArray(source.facts)
    ? source.facts.filter(
        (fact) =>
          fact &&
          typeof fact.label === "string" &&
          typeof fact.value === "string",
      )
    : undefined;
  return { provider: "myhome", ...matched, facts };
}

function decodeListing({
  id,
  data,
  isDraft,
}: PropertyRecord): PropertyListing | null {
  try {
    const listing: PropertyListing = JSON.parse(data);
    if (
      !listing ||
      ![
        listing.title,
        listing.description,
        listing.neighborhood,
        listing.city,
        listing.address,
        listing.seller?.name,
        listing.seller?.role,
      ].every((value) => typeof value === "string") ||
      !propertyTypes.includes(listing.type) ||
      !isPositiveNumber(listing.price) ||
      !isPositiveNumber(listing.areaM2) ||
      !isDate(listing.listedAt) ||
      !Array.isArray(listing.images) ||
      !listing.images.every(
        (photo) =>
          typeof photo === "string" &&
          /^data:image\/(?:jpeg|webp|png);base64,/.test(photo),
      ) ||
      !Array.isArray(listing.amenities) ||
      !listing.amenities.every((amenity) => typeof amenity === "string") ||
      (listing.seller.email !== undefined &&
        typeof listing.seller.email !== "string") ||
      (listing.seller.phone !== undefined &&
        typeof listing.seller.phone !== "string")
    )
      return null;

    const status = isDraft ? "draft" : listing.status;
    if (
      !isDraft &&
      status !== "available" &&
      status !== "pending" &&
      status !== "sold"
    )
      return null;

    const priceHistory = Array.isArray(listing.priceHistory)
      ? listing.priceHistory.filter(
          (entry) =>
            entry && isPositiveNumber(entry.price) && isDate(entry.date),
        )
      : undefined;
    return {
      ...listing,
      id,
      status,
      priceHistory,
      source: decodeSource(listing.source),
      demo: false,
    };
  } catch {
    return null;
  }
}

export async function fetchPropertyListings(
  fetchPage: (after: string | null) => Promise<PropertyRecord[]>,
  signal: AbortSignal,
) {
  const listings: PropertyListing[] = [];
  let after: string | null = null;
  while (!signal.aborted) {
    const page = await fetchPage(after);
    for (const record of page) {
      const listing = decodeListing(record);
      if (listing) listings.push(listing);
    }
    if (page.length < pageSize) return listings;
    const nextCursor = page[page.length - 1].id;
    if (nextCursor === after)
      throw new Error("Listing results could not be paged.");
    after = nextCursor;
  }
  throw signal.reason;
}

export function encodeListing(listing: PropertyListing): PropertyRecord {
  const data = JSON.stringify(listing);
  if (new TextEncoder().encode(data).length > recordByteLimit) {
    throw new Error(
      "This listing is too large. Shorten the description or remove a photo and try again.",
    );
  }
  return { id: listing.id, data, isDraft: listing.status === "draft" };
}
