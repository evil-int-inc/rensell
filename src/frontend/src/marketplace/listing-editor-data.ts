import type { PropertyListing, PropertyStatus, PropertyType } from "./catalog";

export const listingStatusLabels: Record<PropertyStatus, string> = {
  available: "Available",
  pending: "Under offer",
  sold: "Sold",
  draft: "Draft",
};

const importedFieldNames = [
  "title",
  "description",
  "type",
  "price",
  "city",
  "neighborhood",
  "address",
  "areaM2",
  "livingAreaM2",
  "bedrooms",
  "bathrooms",
  "rooms",
  "floor",
  "totalFloors",
  "builtYear",
  "condition",
  "buildingType",
] as const;

export function importedFormValues(fields: Partial<PropertyListing>) {
  const entries: [string, string | number | undefined][] = [
    ...importedFieldNames.map((name): [string, string | number | undefined] => [
      name,
      fields[name],
    ]),
    ["latitude", fields.coordinates?.latitude],
    ["longitude", fields.coordinates?.longitude],
    ["amenities", fields.amenities?.join(", ")],
    ["sellerName", fields.seller?.name],
    ["sellerRole", fields.seller?.role],
    ["sellerEmail", fields.seller?.email],
    ["sellerPhone", fields.seller?.phone],
  ];
  return Object.fromEntries(
    entries.filter(([, value]) => value != null && value !== ""),
  );
}

export function getListingField(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
  )
    return field;
}

export function updateImportedField(
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value?: string | number,
) {
  if (field instanceof HTMLSelectElement) {
    const options = Array.from(field.options);
    const option =
      value == null
        ? (options.find((item) => item.defaultSelected) ?? options[0])
        : options.find((item) => item.value === value);
    if (option) field.value = option.value;
    return;
  }

  const text = value == null ? field.defaultValue : String(value);
  field.value = field.maxLength >= 0 ? text.slice(0, field.maxLength) : text;
}

export function readListingForm(
  data: FormData,
  images: string[],
  id: string,
  existing?: PropertyListing,
): PropertyListing {
  const text = (field: string) => String(data.get(field) ?? "").trim();
  const number = (field: string) => {
    const value = text(field);
    return value ? Number(value) : undefined;
  };
  const title = text("title");
  const description = text("description");
  const city = text("city");
  const neighborhood = text("neighborhood");
  const address = text("address");
  const sellerName = text("sellerName");
  const sellerRole = text("sellerRole");
  const sellerPhone = text("sellerPhone");
  const areaM2 = number("areaM2");
  const price = number("price");
  if (
    !title ||
    !description ||
    !city ||
    !neighborhood ||
    !address ||
    !sellerName ||
    !sellerRole ||
    !price ||
    !areaM2
  ) {
    throw new Error(
      "Fill in the required property, location, and seller fields.",
    );
  }

  const livingAreaM2 = number("livingAreaM2");
  if (livingAreaM2 != null && livingAreaM2 > areaM2) {
    throw new Error("Living area must be within the total property area.");
  }

  const floor = number("floor");
  const totalFloors = number("totalFloors");
  if (floor != null && totalFloors != null && floor > totalFloors) {
    throw new Error(
      "The floor number must be within the building’s total floors.",
    );
  }

  const latitude = number("latitude");
  const longitude = number("longitude");
  if ((latitude == null) !== (longitude == null)) {
    throw new Error("Enter both latitude and longitude to add a map pin.");
  }
  if (
    sellerPhone &&
    (!/^\+?[\d ().-]+$/.test(sellerPhone) ||
      sellerPhone.replace(/\D/g, "").length < 5)
  ) {
    throw new Error("Enter a phone number with at least five digits.");
  }

  const now = new Date().toISOString();
  const priceHistory =
    existing?.priceHistory ??
    (existing ? [{ price: existing.price, date: existing.listedAt }] : []);

  return {
    ...existing,
    id,
    title,
    description,
    type: text("type") as PropertyType,
    price,
    city,
    neighborhood,
    address,
    areaM2,
    livingAreaM2,
    bedrooms: number("bedrooms"),
    bathrooms: number("bathrooms"),
    rooms: number("rooms"),
    floor,
    totalFloors,
    builtYear: number("builtYear"),
    condition: text("condition") || undefined,
    buildingType: text("buildingType") || undefined,
    coordinates:
      latitude != null && longitude != null
        ? { latitude, longitude }
        : undefined,
    images,
    imageDescriptions: existing?.imageDescriptions
      ? images.map(
          (image) =>
            existing.imageDescriptions?.[existing.images.indexOf(image)] ?? "",
        )
      : undefined,
    status: text("status") as PropertyStatus,
    listedAt: existing?.listedAt ?? now,
    amenities: [
      ...new Set(
        text("amenities")
          .split(",")
          .map((amenity) => amenity.trim())
          .filter(Boolean),
      ),
    ],
    priceHistory:
      existing?.price === price
        ? priceHistory
        : [...priceHistory, { price, date: now }],
    seller: {
      name: sellerName,
      role: sellerRole,
      email: text("sellerEmail") || undefined,
      phone: sellerPhone || undefined,
    },
  };
}

export const maxPhotos = 5;

export async function prepareListingPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) {
    throw new Error("Choose an image file of 20 MB or less.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas is unavailable.");

    for (const maxSize of [1400, 1100, 850, 650, 480]) {
      const scale = Math.min(
        1,
        maxSize / Math.max(image.naturalWidth, image.naturalHeight),
      );
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const webp = canvas.toDataURL("image/webp", 0.76);
      const dataUrl = webp.startsWith("data:image/webp;")
        ? webp
        : canvas.toDataURL("image/jpeg", 0.74);
      if (dataUrl.length <= 85_000) return dataUrl;
    }
    throw new Error("Image compression exceeded the size limit.");
  } catch {
    throw new Error(
      "This photo couldn’t be prepared. Try a smaller JPG, PNG, or WebP.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
