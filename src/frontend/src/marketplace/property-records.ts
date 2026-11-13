import type { PropertyRecord } from "@/backend";
import { type PropertyListing, propertyTypes } from "./catalog";
import { resizeListingPhoto } from "./listing-editor-data";
import { readMyHomeSource } from "./myhome-import";

const pageSize = 4;
const recordByteLimit = 480_000;
const sizeError =
  "This listing is too large. Shorten the description or remove a photo and try again.";
const encoder = new TextEncoder();

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

    // The canister flag controls draft visibility without changing the saved ad data.
    const status = isDraft
      ? "draft"
      : listing.status === "draft"
        ? "available"
        : listing.status;
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
    const descriptions = listing.imageDescriptions;
    const imageDescriptions = Array.isArray(descriptions)
      ? listing.images.map((_, index) =>
          typeof descriptions[index] === "string" ? descriptions[index] : "",
        )
      : undefined;
    return {
      ...listing,
      id,
      status,
      imageDescriptions,
      priceHistory,
      source: decodeSource(listing.source),
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
  if (encoder.encode(data).length > recordByteLimit) throw new Error(sizeError);
  return { id: listing.id, data, isDraft: listing.status === "draft" };
}

export async function prepareListingRecord(
  listing: PropertyListing,
): Promise<PropertyRecord> {
  const data = JSON.stringify(listing);
  if (encoder.encode(data).length <= recordByteLimit)
    return { id: listing.id, data, isDraft: listing.status === "draft" };

  const images = listing.images.slice();
  // Empty slots account for the metadata and JSON syntax, leaving a budget
  // for the data URLs. Keep small photos intact and share the rest of the budget.
  const metadata = JSON.stringify({ ...listing, images: images.map(() => "") });
  let remaining = recordByteLimit - encoder.encode(metadata).length;
  if (remaining <= 0 || !images.length) throw new Error(sizeError);
  const bySize = images
    .map((source, index) => ({ source, index }))
    .sort((a, b) => a.source.length - b.source.length);

  for (const [position, { source, index }] of bySize.entries()) {
    const budget = Math.floor(remaining / (bySize.length - position));
    if (source.length > budget) {
      try {
        images[index] = await resizeListingPhoto(source, budget);
      } catch {
        throw new Error(sizeError);
      }
    }
    remaining -= images[index].length;
  }

  return encodeListing({ ...listing, images });
}
