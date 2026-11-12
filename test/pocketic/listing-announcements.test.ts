import { type Actor, PocketIc, createIdentity } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";
import type {
  PropertyRecord,
  _SERVICE,
} from "../../src/frontend/src/declarations/backend.did";
import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";

type Announcement = {
  sequence: number;
  kind: "published" | "updated";
  listing: { id: string; title: string; price: number } | null;
};

const owner = createIdentity("listing-announcements-owner").getPrincipal();
let pic: PocketIc;
let actor: Actor<_SERVICE>;
let gateway: Actor<_SERVICE>;

beforeAll(async () => {
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

afterAll(async () => pic?.tearDown());

function listing(
  id: string,
  title: string,
  price: number,
  isDraft: boolean,
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
      images: [],
      amenities: [],
      seller: { name: "Property seller", role: "Owner" },
    }),
  };
}

async function readAnnouncements(after = 0): Promise<Announcement[]> {
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
  return events;
}

it("announces public saves, publication and real public updates while suppressing hidden listings", async () => {
  const draftId = "draft-apartment";
  await actor.saveProperty(listing(draftId, "Draft apartment", 120_000, true));
  const editedDraft = listing(draftId, "Edited apartment", 125_000, true);
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
    listing: { id: draftId, title: "Edited apartment", price: 125_000 },
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
