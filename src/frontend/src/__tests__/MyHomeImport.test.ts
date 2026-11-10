import { parseMyHomeListing } from "@/marketplace/myhome-import";
import { describe, expect, it } from "vitest";

const sourceUrl =
  "https://www.myhome.ge/en/real-estate/3-room-apartment-for-sale-in-nutsubidze-plateau-26625884/";
const photoBase =
  "https://static-api-statements.tnet.ge/uploads/202611/20261110/statements/";
const statement = {
  id: 26625884,
  dynamic_title: "3 room apartment for sale in Nutsubidze Plateau",
  comment: "Renovated apartment.<br>Two bedrooms &amp; a balcony.",
  deal_type_id: 1,
  real_estate_type_id: 1,
  price: { 1: { price_total: 352730 }, 2: { price_total: 136000 } },
  city_name: "Tbilisi",
  district_name: "Vake-Saburtalo",
  urban_name: "Nutsubidze plateau",
  address: "Paata Datuashvili Street",
  area: 68,
  room_type_id: 3,
  bedroom_type_id: 2,
  bathroom_type_id: 1,
  floor: 5,
  total_floors: 20,
  condition: "Newly renovated",
  height: 3,
  balconies: 1,
  balcony_area: 3,
  lat: 41.731679,
  lng: 44.732731,
  owner_name: "Example owner",
  is_owner: false,
  contact_phone: "555123456",
  images: [
    {
      is_main: false,
      large: `${photoBase}room.webp`,
      thumb: `${photoBase}room_thumb.webp`,
    },
    {
      is_main: 1,
      large: `${photoBase}cover.webp`,
      thumb: `${photoBase}cover_thumb.webp`,
      blur: `${photoBase}cover-blur.webp`,
    },
    { thumb: `${photoBase}room_thumb.webp` },
    { thumb: "https://not-myhome.example/photo.webp" },
  ],
};

function savedPage(value = statement) {
  const nextData = {
    props: {
      pageProps: {
        dehydratedState: {
          queries: [
            {
              queryKey: [
                "statements",
                "details",
                { locale: "en", statementId: "26625885" },
              ],
              state: {
                data: { data: { statement: { ...statement, id: 26625885 } } },
              },
            },
            {
              queryKey: [
                "statements",
                "details",
                { locale: "en", statementId: "26625884" },
              ],
              state: { data: { data: { statement: value } } },
            },
          ],
        },
      },
    },
  };
  return `<!doctype html><html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script></head><body></body></html>`;
}

describe("MyHome listing import", () => {
  it("extracts the matching dehydrated statement and orders unmarked thumbnails with the cover first", () => {
    const result = parseMyHomeListing(
      savedPage(),
      `${sourceUrl}?utm_campaign=share#photo`,
    );
    expect(result.fields).toMatchObject({
      title: statement.dynamic_title,
      description: "Renovated apartment.\nTwo bedrooms & a balcony.",
      type: "Apartment",
      price: 136000,
      city: "Tbilisi",
      neighborhood: "Nutsubidze plateau",
      address: "Paata Datuashvili Street",
      areaM2: 68,
      rooms: 3,
      bedrooms: 2,
      bathrooms: 1,
      floor: 5,
      totalFloors: 20,
      coordinates: { latitude: 41.731679, longitude: 44.732731 },
      amenities: ["Balcony"],
    });
    expect(result.fields.seller).toEqual({ name: "Example owner", role: "" });
    expect(result.photoUrls).toEqual([
      `${photoBase}cover_thumb.webp`,
      `${photoBase}room_thumb.webp`,
    ]);
    expect(result.source).toMatchObject({ id: "26625884", url: sourceUrl });
    expect(result.source.facts).toContainEqual({
      label: "Ceiling height",
      value: "3 m",
    });
    expect(result.source.facts).toContainEqual({
      label: "Seller name",
      value: "Example owner",
    });
    expect(result.warnings).toEqual([
      expect.stringMatching(/seller role could not be verified/i),
    ]);
  });

  it("handles the direct response envelope and ignores watermarked-only photos and GEL prices", () => {
    const result = parseMyHomeListing(
      JSON.stringify({
        data: {
          statement: {
            ...statement,
            price: { 1: { price_total: 352730 } },
            images: [{ large: `${photoBase}watermarked.webp` }],
          },
        },
      }),
      sourceUrl,
    );
    expect(result.fields.price).toBeUndefined();
    expect(result.photoUrls).toEqual([]);
    expect(result.warnings.join(" ")).toMatch(
      /No unmarked photo URLs.*USD asking price/,
    );
  });

  it("uses matching JSON-LD fields and the USD offer when no Next data is present", () => {
    const listing = {
      "@type": "RealEstateListing",
      url: sourceUrl,
      name: statement.dynamic_title,
      offers: [
        { price: 352730, priceCurrency: "GEL" },
        { price: 136000, priceCurrency: "USD" },
      ],
      about: {
        "@type": "Apartment",
        image: [`${photoBase}gallery.webp`],
        floorSize: { value: 68, unitCode: "MTK" },
        address: {
          addressLocality: "Tbilisi",
          streetAddress: statement.address,
        },
      },
      image: [
        {
          url: `${photoBase}display.webp`,
          originalUrl: `${photoBase}original.webp`,
        },
      ],
    };
    const result = parseMyHomeListing(
      `<script type="application/ld+json">${JSON.stringify(listing)}</script>
       <img src="${photoBase}gallery_thumb.webp">
       <img src="${photoBase}recommendation_thumb.webp">`,
      sourceUrl,
    );
    expect(result.fields).toMatchObject({
      title: statement.dynamic_title,
      price: 136000,
      type: "Apartment",
      areaM2: 68,
      city: "Tbilisi",
    });
    expect(result.photoUrls).toEqual([
      `${photoBase}original.webp`,
      `${photoBase}gallery_thumb.webp`,
    ]);
  });

  it("uses a verified saved page's visible details without importing arbitrary images", () => {
    const html = `<link rel="canonical" href="${sourceUrl}">
      <meta property="og:title" content="${statement.dynamic_title}, 136000 $, 68 m², 26625884 | MyHome">
      <main>
        <nav aria-label="Breadcrumb"><a>Sale</a><a>Apartment</a><a>Tbilisi</a><a>Vake-Saburtalo</a><a>Nutsubidze plateau</a></nav>
        <h1>${statement.dynamic_title}</h1><p>ID: 26625884</p>
        <div><span>68 m²</span><span>Area</span></div>
        <div><span>5 / 20</span><span>Floor</span></div>
        <h3>Short description</h3><p>Renovated apartment.<br>Two bedrooms.</p>
        <dl><dt>Condition</dt><dd>Newly renovated</dd></dl>
        <img src="${photoBase}preview.webp">
      </main>`;
    const result = parseMyHomeListing(html, sourceUrl);
    expect(result.fields).toMatchObject({
      price: 136000,
      areaM2: 68,
      floor: 5,
      totalFloors: 20,
      condition: "Newly renovated",
      neighborhood: "Nutsubidze plateau",
      description: "Renovated apartment.\nTwo bedrooms.",
    });
    expect(result.photoUrls).toEqual([]);
  });

  it("rejects mismatched IDs, rental ads, unsupported URLs, and challenge pages", () => {
    expect(() =>
      parseMyHomeListing(savedPage({ ...statement, id: 26625885 }), sourceUrl),
    ).toThrow(/different listing/);
    expect(() =>
      parseMyHomeListing(
        savedPage({ ...statement, deal_type_id: 2 }),
        sourceUrl,
      ),
    ).toThrow(/Only MyHome sale listings/);
    expect(() =>
      parseMyHomeListing(
        savedPage(),
        sourceUrl.replace("www.myhome.ge", "myhome.ge.example"),
      ),
    ).toThrow(/valid MyHome listing URL/);
    expect(() =>
      parseMyHomeListing("<!doctype html><h1>Just a moment…</h1>", sourceUrl),
    ).toThrow(/requested listing/);
  });

  it("rejects oversized saved pages before parsing", () => {
    expect(() =>
      parseMyHomeListing("ა".repeat(2 * 1024 * 1024), sourceUrl),
    ).toThrow(/too large/);
  });
});
