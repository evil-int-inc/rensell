import { createActor } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { maxPhotos, prepareListingPhoto } from "./listing-editor-data";
import { isMyHomePhotoUrl, parseMyHomeListing } from "./myhome-import";

const maxPageSize = 5 * 1024 * 1024;
const maxPhotoSize = 1_000_000;
const supportedImageTypes = ["image/jpeg", "image/png", "image/webp"];

function listingSlug(input: string) {
  try {
    const url = new URL(input.trim());
    const slug =
      /^\/en\/real-estate\/([a-z\d][a-z\d-]*-[1-9]\d{0,15})\/?$/i.exec(
        url.pathname,
      )?.[1];
    if (
      url.protocol === "https:" &&
      (url.hostname === "www.myhome.ge" || url.hostname === "myhome.ge") &&
      !url.username &&
      !url.password &&
      !url.port &&
      slug &&
      slug.length <= 220
    )
      return slug;
  } catch {
    // Keep URL errors specific to the listing form.
  }
  throw new Error(
    "Enter an English MyHome property listing link that ends in the property ID.",
  );
}

async function copyPhoto(url: string, signal: AbortSignal): Promise<string> {
  if (!isMyHomePhotoUrl(url)) throw new Error("Invalid MyHome photo URL.");
  const response = await fetch(url, {
    signal,
    credentials: "omit",
    redirect: "error",
    referrerPolicy: "no-referrer",
    headers: { Accept: "image/webp,image/jpeg,image/png" },
  });
  const type = response.headers.get("content-type")?.split(";", 1)[0] ?? "";
  if (!response.ok || !supportedImageTypes.includes(type) || !response.body) {
    throw new Error("The MyHome photo was unavailable.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxPhotoSize) {
      await reader.cancel();
      throw new Error("The MyHome photo is too large.");
    }
    chunks.push(value.slice());
  }
  return prepareListingPhoto(new File(chunks, "myhome-photo", { type }));
}

export function useMyHomeImport() {
  const { actor } = useActor(createActor);

  return async (url: string, signal: AbortSignal, savedPage?: File) => {
    signal.throwIfAborted();
    let sourceText: string;
    if (savedPage) {
      if (savedPage.size > maxPageSize)
        throw new Error(
          "The saved MyHome page is too large. Choose an HTML file of 5 MB or less.",
        );
      sourceText = await savedPage.text();
    } else {
      const slug = listingSlug(url);
      if (!actor)
        throw new Error(
          "The marketplace backend is still connecting. Try again or import a saved HTML page.",
        );
      sourceText = await actor.readMyHomeListing(slug);
    }
    signal.throwIfAborted();

    const { fields, source, photoUrls, warnings } = parseMyHomeListing(
      sourceText,
      url.trim(),
    );
    const selected = photoUrls.slice(0, maxPhotos);
    const results = await Promise.allSettled(
      selected.map((photo) => copyPhoto(photo, signal)),
    );
    signal.throwIfAborted();
    const images = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    if (images.length < selected.length)
      warnings.push(
        "Some unmarked photos could not be copied. You can upload them separately.",
      );
    if (photoUrls.length > maxPhotos)
      warnings.push(
        `RenSell can hold up to ${maxPhotos} photos per listing. You can replace the imported photos before saving.`,
      );
    return { fields, source, warnings, images };
  };
}
