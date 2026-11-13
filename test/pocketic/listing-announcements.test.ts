import { type Actor, PocketIc, createIdentity } from "@dfinity/pic";
import { afterEach, beforeEach, expect, it } from "vitest";
import type {
  PropertyRecord,
  _SERVICE,
} from "../../src/frontend/src/declarations/backend.did";
import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";

type Announcement = {
  sequence: number;
  kind: "published" | "updated";
  listing: {
    id: string;
    title: string;
    price: number;
    images?: string[];
  } | null;
};

const owner = createIdentity("listing-announcements-owner").getPrincipal();
let pic: PocketIc;
let actor: Actor<_SERVICE>;
let gateway: Actor<_SERVICE>;

beforeEach(async () => {
  pic = await PocketIc.create(process.env.POCKET_IC_URL!);
  const fixture = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: process.env.BACKEND_WASM!,
  });
  actor = fixture.actor;
  actor.setPrincipal(owner);
  await actor._initialize_access_control();
  await actor.bootstrapOwner();
  gateway = pic.createActor<_SERVICE>(idlFactory, fixture.canisterId);
});

afterEach(async () => pic?.tearDown());

function listing(
  id: string,
  title: string,
  price: number,
  isDraft: boolean,
  images: unknown[] = [],
): PropertyRecord {
  return {
    id,
    isDraft,
    data: JSON.stringify({
      id: "embedded-id",
      title,
      price,
      status: isDraft ? "draft" : "available",
      type: "Apartment",
      areaM2: 80,
      city: "Tbilisi",
      neighborhood: "Vera",
      address: "Vera Park area",
      description: "An apartment in Tbilisi.",
      listedAt: "2026-10-01",
      images,
      amenities: [],
      seller: { name: "Property seller", role: "Owner" },
    }),
  };
}

async function readAnnouncementPage(after = 0): Promise<{
  events: Announcement[];
  byteLength: number;
}> {
  const request = {
    method: "GET",
    url: `/api/listing-announcements?after=${after}`,
    headers: [],
    body: new Uint8Array(),
  };
  const handshake = await gateway.http_request({
    ...request,
    certificate_version: [2],
  });
  expect(handshake.upgrade).toEqual([true]);

  const response = await gateway.http_request_update(request);
  expect(response.status_code).toBe(200);
  const { events } = JSON.parse(new TextDecoder().decode(response.body));
  return { events, byteLength: response.body.byteLength };
}

async function readAnnouncements(after = 0): Promise<Announcement[]> {
  return (await readAnnouncementPage(after)).events;
}

it("announces public saves, publication and real public updates while suppressing hidden listings", async () => {
  const draftId = "draft-apartment";
  await actor.saveProperty(listing(draftId, "Draft apartment", 120_000, true));
  const gallery = [
    "data:image/jpeg;base64,Y292ZXI=",
    "data:image/webp;base64,c2Vjb25k",
    "data:image/png;base64,dGhpcmQ=",
  ];
  const editedDraft = listing(draftId, "Edited apartment", 125_000, true, [
    null,
    gallery[0],
    42,
    gallery[1],
    "",
    "data:image/gif;base64,Z2lm",
    gallery[2],
  ]);
  await actor.updateProperty(editedDraft);
  expect(await readAnnouncements()).toEqual([]);

  await actor.publishProperty(draftId);
  await actor.publishProperty(draftId);
  const publishedEvents = await readAnnouncements();
  expect(publishedEvents).toHaveLength(1);
  const [published] = publishedEvents;
  expect(published).toMatchObject({
    sequence: expect.any(Number),
    kind: "published",
    listing: {
      id: draftId,
      title: "Edited apartment",
      price: 125_000,
      images: gallery,
    },
  });

  const [publicRecord] = await actor.listProperties([]);
  await actor.updateProperty(publicRecord);
  expect(await readAnnouncements(published.sequence)).toEqual([]);

  await actor.updateProperty(
    listing(draftId, "Updated apartment", 130_000, false),
  );
  const updatedEvents = await readAnnouncements(published.sequence);
  expect(updatedEvents).toHaveLength(1);
  const [updated] = updatedEvents;
  expect(updated.sequence).toBeGreaterThan(published.sequence);
  expect(updated).toMatchObject({
    kind: "updated",
    listing: { id: draftId, title: "Updated apartment", price: 130_000 },
  });

  await actor.makePropertyDraft(draftId);
  expect(await readAnnouncements()).toEqual([
    { ...published, listing: null },
    { ...updated, listing: null },
  ]);

  const directId = "direct-apartment";
  await actor.saveProperty(
    listing(directId, "Direct public apartment", 140_000, false),
  );
  const directEvents = await readAnnouncements(updated.sequence);
  expect(directEvents).toHaveLength(1);
  const [direct] = directEvents;
  expect(direct).toMatchObject({
    kind: "published",
    listing: { id: directId, title: "Direct public apartment", price: 140_000 },
  });

  await actor.deleteProperty(directId);
  expect(await readAnnouncements(updated.sequence)).toEqual([
    { ...direct, listing: null },
  ]);

  await actor.publishProperty(draftId);
  const [republished] = await readAnnouncements(direct.sequence);
  expect(republished).toMatchObject({
    kind: "published",
    listing: { id: draftId, title: "Updated apartment" },
  });
  expect(await readAnnouncements()).toEqual([
    { ...published, listing: null },
    { ...updated, listing: null },
    { ...direct, listing: null },
    republished,
  ]);
});

it("returns four near-limit galleries in one response below 2 MiB", async () => {
  const gallery = Array.from(
    { length: 12 },
    (_, index) =>
      `data:image/webp;base64,${String.fromCharCode(65 + index).repeat(39_936)}`,
  );
  const ids = ["large-a", "large-b", "large-c", "large-d"];
  for (const id of ids) {
    const record = listing(id, "Large apartment", 150_000, false, gallery);
    expect(new TextEncoder().encode(record.data).byteLength).toBeGreaterThan(
      479_000,
    );
    await actor.saveProperty(record);
  }
  await actor.saveProperty(
    listing("next-page", "Next apartment", 160_000, false),
  );

  const { events, byteLength } = await readAnnouncementPage();
  expect(events.map(({ listing }) => listing?.id)).toEqual(ids);
  for (const event of events) expect(event.listing?.images).toEqual(gallery);
  expect(byteLength).toBeLessThan(2 * 1024 * 1024);

  const nextEvents = await readAnnouncements(
    events[events.length - 1].sequence,
  );
  expect(nextEvents.map(({ listing }) => listing?.id)).toEqual(["next-page"]);
});
