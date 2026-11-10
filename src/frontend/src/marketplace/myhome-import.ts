import type { PropertyListing, PropertyType } from "./catalog";

type RecordValue = Record<string, unknown>;
type SourceFact = { label: string; value: string };

export type MyHomeImport = {
  fields: Partial<PropertyListing>;
  photoUrls: string[];
  source: { id: string; url: string; facts?: SourceFact[] };
  warnings: string[];
};

const sourceLimit = 5 * 1024 * 1024;
const myHomeHosts = new Set(["myhome.ge", "www.myhome.ge"]);
const photoHosts = new Set([
  "static.my.ge",
  "static-statements.tnet.ge",
  "static-api-statements.tnet.ge",
]);

export function readMyHomeSource(value: string, base?: string) {
  try {
    const url = new URL(value, base);
    if (
      url.protocol !== "https:" ||
      !myHomeHosts.has(url.hostname) ||
      url.port ||
      url.username ||
      url.password
    )
      return undefined;

    const id =
      /^\/(?:(?:en|ka|ru)\/)?(?:real-estate|udzravi-qoneba)\/(?:[^/]+-)?([1-9]\d{0,15})\/?$/.exec(
        url.pathname,
      )?.[1] ??
      /^\/(?:(?:en|ka|ru)\/)?pr\/([1-9]\d{0,15})(?:\/[^/]+)?\/?$/.exec(
        url.pathname,
      )?.[1];
    if (!id) return undefined;
    url.search = "";
    url.hash = "";
    return { id, url: url.href };
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): RecordValue | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : undefined;
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim() || undefined;
}

function label(value: unknown): string | undefined {
  const record = asRecord(value);
  return (
    text(value) ??
    text(record?.en) ??
    text(record?.name) ??
    text(record?.title) ??
    text(record?.ka) ??
    text(record?.ru)
  );
}

function number(value: unknown): number | undefined {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[\s,]/g, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : undefined;
}

function positive(value: unknown) {
  const result = number(value);
  return result !== undefined && result > 0 ? result : undefined;
}

function coordinates(lat: unknown, lng: unknown) {
  const latitude = number(lat);
  const longitude = number(lng);
  return latitude !== undefined &&
    longitude !== undefined &&
    Math.abs(latitude) <= 85 &&
    Math.abs(longitude) <= 180
    ? { latitude, longitude }
    : undefined;
}

function integerBetween(value: unknown, min: number, max: number) {
  const result = number(value);
  return result !== undefined &&
    Number.isInteger(result) &&
    result >= min &&
    result <= max
    ? result
    : undefined;
}

function addFacts(
  source: MyHomeImport["source"],
  values: Record<string, string | undefined>,
) {
  const facts = Object.entries(values).flatMap(([label, value]) =>
    value ? [{ label, value }] : [],
  );
  if (facts.length) source.facts = [...(source.facts ?? []), ...facts];
}

function description(value: unknown) {
  const input = label(value);
  if (!input) return undefined;
  const template = document.createElement("template");
  template.innerHTML = input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li)>/gi, "\n");
  for (const node of template.content.querySelectorAll(
    "script, style, template",
  ))
    node.remove();
  return text(template.content.textContent);
}

function propertyType(value: unknown): PropertyType | undefined {
  const type = label(value)
    ?.toLowerCase()
    .replace(/^.*[\/#]/, "");
  if (!type) return undefined;
  if (["apartment", "flat"].includes(type)) return "Apartment";
  if (
    [
      "house",
      "private house",
      "singlefamilyresidence",
      "country house",
    ].includes(type)
  )
    return "House";
  if (type === "villa") return "Villa";
  if (
    ["commercial", "commercial area", "commercial property", "hotel"].includes(
      type,
    )
  )
    return "Commercial";
  if (["land", "plot", "land plot"].includes(type)) return "Land";
  return undefined;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function photoUrl(value: unknown) {
  const urlText = text(value) ?? text(asRecord(value)?.url);
  if (!urlText) return undefined;
  try {
    const url = new URL(urlText);
    if (
      url.protocol === "https:" &&
      photoHosts.has(url.hostname) &&
      !url.port &&
      !url.username &&
      !url.password &&
      /\.(?:jpe?g|png|webp)$/i.test(url.pathname)
    )
      return url.href;
  } catch {
    return undefined;
  }
}

export function isMyHomePhotoUrl(url: string) {
  return photoUrl(url) !== undefined;
}

function originalPhotos(record: RecordValue) {
  const urls = new Set<string>();
  const add = (value: unknown) => {
    const url = photoUrl(value);
    if (url) urls.add(url);
  };
  for (const values of [
    record.originalPhotos,
    record.original_images,
    record.originalImageUrls,
    record.unwatermarkedPhotos,
  ]) {
    if (Array.isArray(values)) values.forEach(add);
  }
  for (const values of [record.photos, record.images, record.image]) {
    for (const value of Array.isArray(values) ? values : [values]) {
      const image = asRecord(value);
      if (!image) continue;
      add(
        image.unwatermarkedUrl ??
          image.unwatermarked_url ??
          image.originalUrl ??
          image.original_url ??
          image.original,
      );
    }
  }
  return urls;
}

function isMyHomeThumbnail(url: string) {
  const parsed = new URL(url);
  return (
    parsed.hostname === "static-api-statements.tnet.ge" &&
    /^\/uploads\/\d{6}\/\d{8}\/statements\/[^/]+_thumb\.webp$/i.test(
      parsed.pathname,
    )
  );
}

function photoIdentity(url: string) {
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname.replace(/_thumb(?=\.webp$)/i, "")}`;
}

function schemaPhotos(
  record: RecordValue,
  fragment: DocumentFragment | undefined,
) {
  const photos = originalPhotos(record);
  const gallery = asRecord(record.about)?.image ?? record.image;
  const identities = new Set<string>();
  for (const image of Array.isArray(gallery) ? gallery : [gallery]) {
    const url = photoUrl(image);
    if (!url) continue;
    identities.add(photoIdentity(url));
    if (isMyHomeThumbnail(url)) photos.add(url);
  }
  for (const image of fragment?.querySelectorAll("img[src]") ?? []) {
    const url = photoUrl(image.getAttribute("src"));
    if (url && isMyHomeThumbnail(url) && identities.has(photoIdentity(url)))
      photos.add(url);
  }
  return photos;
}

function findStatement(document: unknown, id: string) {
  const root = asRecord(document);
  if (!root) return undefined;
  const pageProps = asRecord(asRecord(root.props)?.pageProps);
  const queries = asRecord(pageProps?.dehydratedState)?.queries;
  if (Array.isArray(queries)) {
    for (const value of queries) {
      const query = asRecord(value);
      const key = query?.queryKey;
      if (
        !Array.isArray(key) ||
        key[0] !== "statements" ||
        key[1] !== "details" ||
        String(asRecord(key[2])?.statementId) !== id
      )
        continue;
      const response = asRecord(asRecord(query?.state)?.data);
      const statement = asRecord(asRecord(response?.data)?.statement);
      if (statement) return statement;
    }
    return undefined;
  }
  return (
    asRecord(asRecord(root.data)?.statement ?? root.statement) ??
    (root.dynamic_title ? root : undefined)
  );
}

const typeById: Partial<Record<number, PropertyType>> = {
  1: "Apartment",
  2: "House",
  3: "House",
  4: "Land",
  5: "Commercial",
  6: "Commercial",
};

function myHomeFields(
  item: RecordValue,
  source: MyHomeImport["source"],
): Partial<PropertyListing> {
  if (String(item.id) !== source.id) {
    throw new Error(
      "MyHome returned a different listing than the one requested.",
    );
  }
  const deal = number(item.deal_type_id);
  if (deal !== undefined && deal !== 1) {
    throw new Error("Only MyHome sale listings can be imported.");
  }

  const priceUsd = asRecord(asRecord(item.price)?.["2"]);
  const sellerName = text(item.owner_name);
  const sellerRole = label(item.owner_type);
  const balconyCount = positive(item.balconies);
  const balconyArea = positive(item.balcony_area);
  const height = positive(item.height);
  const livingRoomArea = positive(item.living_room_area);
  addFacts(source, {
    "Building status":
      number(item.status_id) === 2 ? "New building" : undefined,
    "Listed on MyHome": text(item.created_at),
    "Last updated on MyHome": text(item.last_updated),
    "Seller name": !sellerRole ? sellerName : undefined,
    "Ceiling height": height ? `${height} m` : undefined,
    Balconies: balconyCount ? String(balconyCount) : undefined,
    "Balcony area": balconyArea ? `${balconyArea} m²` : undefined,
    "Living room area": livingRoomArea ? `${livingRoomArea} m²` : undefined,
  });
  return {
    title: label(item.dynamic_title),
    description: description(item.comment),
    type: typeById[number(item.real_estate_type_id) ?? 0],
    price: positive(priceUsd?.price_total),
    city: label(item.city_name),
    neighborhood: label(item.urban_name) ?? label(item.district_name),
    address: label(item.address),
    areaM2: positive(item.area),
    floor: number(item.floor),
    totalFloors: positive(item.total_floors),
    condition: label(item.condition),
    buildingType: number(item.project_type_id) === 6 ? "City" : undefined,
    rooms: integerBetween(item.room_type_id, 1, 5),
    bedrooms: integerBetween(item.bedroom_type_id, 1, 9),
    bathrooms: integerBetween(item.bathroom_type_id, 1, 5),
    builtYear: integerBetween(item.build_year, 1000, 9999),
    coordinates: coordinates(item.lat, item.lng),
    seller:
      sellerName && sellerRole
        ? { name: sellerName, role: sellerRole }
        : undefined,
    amenities: balconyCount ? ["Balcony"] : undefined,
  };
}

function statementPhotos(statement: RecordValue) {
  if (!Array.isArray(statement.images)) return new Set<string>();
  const main: string[] = [];
  const rest: string[] = [];
  for (const value of statement.images) {
    const image = asRecord(value);
    if (!image) continue;
    const url =
      photoUrl(
        image.unwatermarkedUrl ??
          image.unwatermarked_url ??
          image.originalUrl ??
          image.original_url ??
          image.original,
      ) ?? photoUrl(image.thumb);
    if (!url) continue;
    const target =
      image.is_main === true || number(image.is_main) === 1 ? main : rest;
    target.push(url);
  }
  return new Set([...main, ...rest]);
}

function matchedSchemaListing(
  documents: unknown[],
  source: MyHomeImport["source"],
  verifiedPage: boolean,
) {
  const listings = documents
    .flatMap((document) => {
      const graph = asRecord(document)?.["@graph"];
      return Array.isArray(graph)
        ? graph
        : Array.isArray(document)
          ? document
          : [document];
    })
    .flatMap((value) => {
      const item = asRecord(value);
      if (!item || ![item["@type"]].flat().includes("RealEstateListing"))
        return [];
      return [item];
    });
  let unlinked: RecordValue | undefined;
  for (const item of listings) {
    const identifier = asRecord(item.identifier)?.value ?? item.identifier;
    const id = /^[1-9]\d*$/.test(String(identifier))
      ? String(identifier)
      : undefined;
    const recordUrl = text(item.url) ?? text(item["@id"]);
    const linkedSource = recordUrl
      ? readMyHomeSource(recordUrl, source.url)
      : undefined;
    if (
      (id && id !== source.id) ||
      (linkedSource && linkedSource.id !== source.id)
    )
      continue;
    if (id === source.id || linkedSource?.id === source.id) return item;
    if (listings.length === 1 && verifiedPage) unlinked = item;
  }
  return unlinked;
}

function schemaFields(
  item: RecordValue,
  source: MyHomeImport["source"],
): Partial<PropertyListing> {
  const offersList = Array.isArray(item.offers)
    ? item.offers.map(asRecord)
    : [asRecord(item.offers)];
  const offers =
    offersList.find(
      (offer) => text(offer?.priceCurrency)?.toUpperCase() === "USD",
    ) ?? offersList[0];
  const home =
    asRecord(item.mainEntity) ??
    asRecord(item.about) ??
    asRecord(offers?.itemOffered) ??
    item;
  const deal = text(offers?.businessFunction)?.toLowerCase();
  if (deal && /rent|lease/.test(deal))
    throw new Error("Only MyHome sale listings can be imported.");

  const address = asRecord(home.address);
  const geo = asRecord(home.geo);
  const currency = text(offers?.priceCurrency)?.toUpperCase();
  const floorSize = asRecord(home.floorSize);
  const floorSizeUnit = text(
    floorSize?.unitCode ?? floorSize?.unitText,
  )?.toUpperCase();
  const areaM2 =
    floorSizeUnit && ["MTK", "M²", "M2", "SQM"].includes(floorSizeUnit)
      ? positive(floorSize?.value)
      : undefined;
  const seller = asRecord(offers?.seller ?? item.seller);
  const sellerName = label(seller?.name);
  const sellerRole = label(seller?.jobTitle ?? seller?.roleName);
  const amenities = home.amenityFeature;
  const names = Array.isArray(amenities)
    ? amenities.flatMap((value) => {
        const feature = asRecord(value);
        const name = label(value);
        return name &&
          (!feature || feature.value === undefined || feature.value === true)
          ? [name]
          : [];
      })
    : undefined;

  addFacts(source, {
    "Published on MyHome": text(item.datePosted ?? item.datePublished),
  });
  return {
    title: label(item.name ?? home.name),
    description: description(item.description ?? home.description),
    type: propertyType(home["@type"]),
    price: currency === "USD" ? positive(offers?.price) : undefined,
    city: label(address?.addressLocality),
    address: label(address?.streetAddress ?? home.address),
    areaM2,
    bedrooms: number(home.numberOfBedrooms),
    bathrooms: number(home.numberOfBathroomsTotal),
    rooms: number(home.numberOfRooms),
    floor: number(home.floorLevel),
    totalFloors: positive(home.numberOfFloors),
    builtYear: integerBetween(home.yearBuilt, 1000, 9999),
    coordinates: coordinates(geo?.latitude, geo?.longitude),
    amenities: names?.length ? [...new Set(names)] : undefined,
    seller:
      sellerName && sellerRole
        ? { name: sellerName, role: sellerRole }
        : undefined,
  };
}

function meta(fragment: DocumentFragment, key: string) {
  return text(
    fragment
      .querySelector(`meta[property="${key}"], meta[name="${key}"]`)
      ?.getAttribute("content"),
  );
}

function visibleFields(
  fragment: DocumentFragment,
  source: MyHomeImport["source"],
): Partial<PropertyListing> {
  const root = fragment.querySelector("main") ?? fragment;
  const h1 = text(root.querySelector("h1")?.textContent);
  const exactLabel = (labels: string[]) =>
    Array.from(root.querySelectorAll("dt, th, p, span, div, h2, h3, h4")).find(
      (element) =>
        element.childElementCount === 0 &&
        labels.includes(element.textContent?.trim().toLowerCase() ?? ""),
    );
  function readLabel(labels: string[], pattern?: RegExp) {
    const element = exactLabel(labels);
    if (!element) return undefined;
    const next = text(element.nextElementSibling?.textContent);
    const previous = text(element.previousElementSibling?.textContent);
    return pattern && !["DT", "TH"].includes(element.tagName)
      ? [previous, next].find((value) => value && pattern.test(value))
      : [next].find((value) => value && (!pattern || pattern.test(value)));
  }

  const area = readLabel(
    ["area", "ფართი", "площадь"],
    /^\d+(?:\.\d+)?\s*(?:m²|m2|მ²|м²)$/i,
  );
  const rooms = readLabel(["rooms", "ოთახები", "комнаты"], /^\d+$/);
  const bedrooms = readLabel(
    ["bedroom", "bedrooms", "საძინებელი", "спальня", "спальни"],
    /^\d+$/,
  );
  const floor = readLabel(
    ["floor", "სართული", "этаж"],
    /^-?\d+\s*\/\s*\d+$/,
  )?.split("/");
  const bathrooms = readLabel(
    ["bathrooms", "სველი წერტილები", "ванные"],
    /^\d+$/,
  );
  const titleMeta =
    meta(fragment, "og:title") ??
    text(fragment.querySelector("title")?.textContent);
  const dollarAmount = titleMeta?.match(
    /(?:^|[,|])\s*([\d,. ]+)\s*(?:\$|USD)(?=\s|,|\||$)/i,
  )?.[1];
  const currency = meta(fragment, "product:price:currency")?.toUpperCase();
  const price =
    currency === "USD"
      ? positive(meta(fragment, "product:price:amount"))
      : positive(dollarAmount);
  const info = root.querySelector(
    '[aria-label="Breadcrumb" i], nav.breadcrumbs, .breadcrumb, .breadcrumbs',
  );
  const breadcrumbs = info
    ? Array.from(info.querySelectorAll("a")).map((link) =>
        text(link.textContent),
      )
    : [];
  const categoryIndex = breadcrumbs.findIndex(
    (value) => propertyType(value) !== undefined,
  );
  if (
    /\bfor (?:rent|lease)\b/i.test(h1 ?? "") ||
    breadcrumbs.some((part) => /^(?:rent|lease|daily rent)$/i.test(part ?? ""))
  ) {
    throw new Error("Only MyHome sale listings can be imported.");
  }
  const summaryHeading = exactLabel([
    "short description",
    "მოკლე აღწერა",
    "краткое описание",
  ]);
  const shortDescription = description(
    summaryHeading?.nextElementSibling?.innerHTML,
  );
  const seller = root.querySelector(
    '[itemprop="seller"], [aria-label="Seller" i]',
  );
  const sellerName = text(
    seller?.querySelector('[itemprop="name"]')?.textContent,
  );
  const sellerRole = text(
    seller?.querySelector('[itemprop="jobTitle"], [itemprop="roleName"]')
      ?.textContent,
  );
  const phone = seller
    ?.querySelector('a[href^="tel:"]')
    ?.getAttribute("href")
    ?.slice(4);
  const email = seller
    ?.querySelector('a[href^="mailto:"]')
    ?.getAttribute("href")
    ?.slice(7);
  const addition = [
    ["Building status", readLabel(["status", "building status"])],
    ["Ceiling height", readLabel(["ceiling height"])],
    ["Balcony", readLabel(["balcony"])],
  ];
  const facts = addition.flatMap(([label, value]) =>
    label && value ? [{ label, value }] : [],
  );
  if (facts.length) source.facts = [...(source.facts ?? []), ...facts];
  return {
    title: h1,
    description: shortDescription ?? meta(fragment, "og:description"),
    type:
      categoryIndex >= 0 ? propertyType(breadcrumbs[categoryIndex]) : undefined,
    price,
    city: categoryIndex >= 0 ? breadcrumbs[categoryIndex + 1] : undefined,
    neighborhood:
      categoryIndex >= 0
        ? (breadcrumbs[categoryIndex + 3] ?? breadcrumbs[categoryIndex + 2])
        : undefined,
    address: text(
      root.querySelector('[itemprop="streetAddress"], address')?.textContent,
    ),
    areaM2: positive(area?.match(/^\d+(?:\.\d+)?/)?.[0]),
    rooms: number(rooms),
    bedrooms: number(bedrooms),
    bathrooms: number(bathrooms),
    floor: number(floor?.[0]),
    totalFloors: positive(floor?.[1]),
    condition: readLabel(["condition"]),
    buildingType: readLabel(["type of project", "project type"]),
    amenities: facts.some(({ label }) => label === "Balcony")
      ? ["Balcony"]
      : undefined,
    seller:
      sellerName && sellerRole
        ? {
            name: sellerName,
            role: sellerRole,
            phone:
              phone &&
              /^\+?[\d ().-]{5,30}$/.test(phone) &&
              phone.replace(/\D/g, "").length >= 5
                ? phone
                : undefined,
            email:
              email && /^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(email)
                ? email
                : undefined,
          }
        : undefined,
  };
}

export function parseMyHomeListing(
  sourceText: string,
  sourceUrl: string,
): MyHomeImport {
  const source: MyHomeImport["source"] | undefined =
    readMyHomeSource(sourceUrl);
  if (!source) throw new Error("Enter a valid MyHome listing URL.");
  if (
    sourceText.length > sourceLimit ||
    new TextEncoder().encode(sourceText).byteLength > sourceLimit
  ) {
    throw new Error("This MyHome source is too large to import.");
  }

  const input = sourceText.trim();
  let fragment: DocumentFragment | undefined;
  let verifiedPage = false;
  const documents: unknown[] = [];
  if (input.startsWith("<")) {
    const template = document.createElement("template");
    template.innerHTML = input;
    fragment = template.content;
    for (const script of fragment.querySelectorAll(
      "script, style, template, noscript",
    )) {
      if (
        script.id === "__NEXT_DATA__" ||
        script.id === "detailed-page-json" ||
        script.getAttribute("type") === "application/ld+json"
      ) {
        documents.push(parseJson(script.textContent ?? ""));
      }
      script.remove();
    }
    const canonicalUrl =
      fragment.querySelector('link[rel="canonical"]')?.getAttribute("href") ??
      meta(fragment, "og:url");
    const canonical = canonicalUrl
      ? readMyHomeSource(canonicalUrl, source.url)
      : undefined;
    const visibleId = (
      fragment.querySelector("main") ?? fragment
    ).textContent?.match(/\bID\s*[:#]\s*([1-9]\d*)\b/i)?.[1];
    if (
      (canonical && canonical.id !== source.id) ||
      (visibleId && visibleId !== source.id)
    ) {
      throw new Error("The saved page belongs to a different MyHome listing.");
    }
    verifiedPage = canonical?.id === source.id || visibleId === source.id;
  } else {
    documents.push(parseJson(input));
  }

  const statement = documents
    .map((document) => findStatement(document, source.id))
    .find((item) => item !== undefined);
  const record = matchedSchemaListing(
    documents,
    source,
    verifiedPage || String(statement?.id) === source.id,
  );
  if (!statement && !record && !verifiedPage)
    throw new Error(
      "Couldn’t find the requested listing in the MyHome source.",
    );

  const fields = fragment ? visibleFields(fragment, source) : {};
  function mergeFields(structured: Partial<PropertyListing>) {
    if (structured.seller && fields.seller?.name === structured.seller.name) {
      structured.seller = { ...fields.seller, ...structured.seller };
    }
    Object.assign(
      fields,
      Object.fromEntries(
        Object.entries(structured).filter(([, value]) => value !== undefined),
      ),
    );
  }
  if (record) mergeFields(schemaFields(record, source));
  if (statement) mergeFields(myHomeFields(statement, source));
  if (
    !fields.title ||
    (!fields.description && !fields.price && !fields.areaM2)
  ) {
    throw new Error(
      "The MyHome source does not contain enough listing details to import.",
    );
  }

  const photos = statement ? statementPhotos(statement) : new Set<string>();
  if (record) for (const url of schemaPhotos(record, fragment)) photos.add(url);
  if (fragment) {
    for (const image of fragment.querySelectorAll(
      "img[data-unwatermarked-src]",
    )) {
      const url = photoUrl(image.getAttribute("data-unwatermarked-src"));
      if (url) photos.add(url);
    }
  }
  const warnings: string[] = [];
  if (!photos.size)
    warnings.push(
      "No unmarked photo URLs were available in the MyHome source.",
    );
  if (!fields.price)
    warnings.push(
      "A USD asking price was not available. Enter the price before saving.",
    );
  const sellerName = source.facts?.find(
    ({ label }) => label === "Seller name",
  )?.value;
  if (!fields.seller && sellerName) {
    fields.seller = { name: sellerName, role: "" };
    warnings.push(
      "The seller role could not be verified. Review the seller details before saving.",
    );
  }
  if (source.facts) {
    source.facts = source.facts.filter(
      (fact, index, facts) =>
        facts.findIndex(
          ({ label, value }) => label === fact.label && value === fact.value,
        ) === index,
    );
  }
  return { fields, photoUrls: [...photos], source, warnings };
}
