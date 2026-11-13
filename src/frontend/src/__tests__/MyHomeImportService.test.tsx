import { useMyHomeImport } from "@/marketplace/myhome-import-service";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readListing: vi.fn(),
  parseListing: vi.fn(),
  preparePhoto: vi.fn(),
}));

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: { readMyHomeListing: mocks.readListing } }),
}));
vi.mock("@/marketplace/myhome-import", () => ({
  isMyHomePhotoUrl: () => true,
  parseMyHomeListing: mocks.parseListing,
}));
vi.mock("@/marketplace/listing-editor-data", () => ({
  prepareListingPhoto: mocks.preparePhoto,
}));

const url = "https://www.myhome.ge/en/real-estate/apartment-for-sale-26625884/";
const photoUrls = Array.from(
  { length: 9 },
  (_, index) => `https://static.my.ge/photos/photo-${index}.webp`,
);

function photoResponse(index: number) {
  return new Response(String(index), {
    headers: { "content-type": "image/webp" },
  });
}

beforeEach(() => {
  mocks.readListing.mockResolvedValue("listing data");
  mocks.parseListing.mockReturnValue({
    fields: {},
    source: { id: "26625884", url },
    warnings: [],
    photoUrls,
  });
  mocks.preparePhoto.mockImplementation(
    (photo: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(photo);
      }),
  );
});

afterEach(() => vi.unstubAllGlobals());

it("copies every batch in source order despite out-of-order and failed requests", async () => {
  const release = new Map<string, (response: Response) => void>();
  const fetchPhoto = vi.fn(
    (photoUrl: string) =>
      new Promise<Response>((resolve) => release.set(photoUrl, resolve)),
  );
  vi.stubGlobal("fetch", fetchPhoto);
  const { result } = renderHook(useMyHomeImport);
  const imported = result.current(url, new AbortController().signal);

  await waitFor(() => expect(fetchPhoto).toHaveBeenCalledTimes(4));
  for (const index of [3, 2, 1, 0]) {
    release.get(photoUrls[index])?.(
      index === 1 ? new Response(null, { status: 404 }) : photoResponse(index),
    );
  }

  await waitFor(() => expect(fetchPhoto).toHaveBeenCalledTimes(8));
  for (const index of [7, 6, 5, 4])
    release.get(photoUrls[index])?.(photoResponse(index));
  await waitFor(() => expect(fetchPhoto).toHaveBeenCalledTimes(9));
  release.get(photoUrls[8])?.(photoResponse(8));

  expect(fetchPhoto.mock.calls.map(([photoUrl]) => photoUrl)).toEqual(
    photoUrls,
  );
  await expect(imported).resolves.toMatchObject({
    images: ["0", "2", "3", "4", "5", "6", "7", "8"],
    warnings: [
      "Some unmarked photos could not be copied. You can upload them separately.",
    ],
  });
});

it("stops before the next batch after cancellation", async () => {
  const controller = new AbortController();
  const fetchPhoto = vi.fn(async () => {
    controller.abort();
    return photoResponse(0);
  });
  vi.stubGlobal("fetch", fetchPhoto);
  const { result } = renderHook(useMyHomeImport);

  await expect(result.current(url, controller.signal)).rejects.toMatchObject({
    name: "AbortError",
  });
  expect(fetchPhoto).toHaveBeenCalledTimes(4);
});
