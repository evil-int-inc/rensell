import type { PropertyListing } from "@/marketplace/catalog";
import * as photoTools from "@/marketplace/listing-editor-data";
import {
  fetchPropertyListings,
  prepareListingRecord,
} from "@/marketplace/property-records";
import { expect, it, vi } from "vitest";

it("saves and reloads a gallery larger than five photos within the listing byte limit", async () => {
  const imageData = "data:image/webp;base64,";
  const images = Array.from(
    { length: 12 },
    (_, index) => imageData + String.fromCharCode(65 + index).repeat(80_000),
  );
  images[2] = `${imageData}CCCC`;
  const listing: PropertyListing = {
    id: "full-gallery",
    title: "ბინა",
    description: "Квартира с балконом.",
    type: "Apartment",
    price: 150_000,
    neighborhood: "Vera",
    city: "Tbilisi",
    address: "Vera Park",
    areaM2: 80,
    images,
    imageDescriptions: images.map((_, index) => `Room ${index + 1}`),
    status: "available",
    listedAt: "2026-10-01",
    amenities: [],
    seller: { name: "Seller", role: "Owner" },
  };
  const resize = vi.spyOn(photoTools, "resizeListingPhoto");
  resize.mockImplementation(async (image, limit) => image.slice(0, limit));
  try {
    const record = await prepareListingRecord(listing);
    expect(new TextEncoder().encode(record.data).length).toBeLessThanOrEqual(
      480_000,
    );
    const [saved] = await fetchPropertyListings(
      async () => [record],
      new AbortController().signal,
    );
    expect(saved.images).toHaveLength(images.length);
    expect(saved.images.map((image) => image[imageData.length])).toEqual(
      images.map((image) => image[imageData.length]),
    );
    expect(saved.images[2]).toBe(images[2]);
    expect(saved.imageDescriptions).toEqual(listing.imageDescriptions);
    expect(resize).toHaveBeenCalledTimes(11);
  } finally {
    resize.mockRestore();
  }
});
