import { createRequire } from "node:module";
import { type Actor, PocketIc, createIdentity } from "@dfinity/pic";
import type { PocketIcClient } from "@dfinity/pic/dist/pocket-ic-client";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";
import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";

const owner = createIdentity("myhome-import-owner").getPrincipal();
const member = createIdentity("myhome-import-member").getPrincipal();
const require = createRequire(import.meta.url);
const picRequire = createRequire(require.resolve("@dfinity/pic"));
const { IDL } = picRequire("@icp-sdk/core/candid");
const slug = "3-room-apartment-for-sale-in-nutsubidze-plateau-26625884";
let pic: PocketIc;
let actor: Actor<_SERVICE>;
let canisterId: typeof owner;

beforeAll(async () => {
  pic = await PocketIc.create(process.env.POCKET_IC_URL!);
  ({ actor, canisterId } = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: process.env.BACKEND_WASM!,
  }));
  actor.setPrincipal(owner);
  await actor._initialize_access_control();
  actor.setPrincipal(member);
  await actor._initialize_access_control();
});

afterAll(async () => pic?.tearDown());

async function respondToImport(statusCode: number, body: string) {
  const client = (pic as unknown as { client: PocketIcClient }).client;
  const method = idlFactory({ IDL })._fields.find(
    ([name]) => name === "readMyHomeListing",
  )![1];
  const submitted = await client.submitCall({
    canisterId,
    sender: owner,
    method: "readMyHomeListing",
    payload: new Uint8Array(IDL.encode(method.argTypes, [slug])),
  });
  let pending = await pic.getPendingHttpsOutcalls();
  for (let round = 0; pending.length === 0 && round < 8; round++) {
    await pic.tick(1);
    pending = await pic.getPendingHttpsOutcalls();
  }
  expect(pending).toHaveLength(1);
  const [request] = pending;
  expect(request.url).toBe(`https://www.myhome.ge/en/real-estate/${slug}/`);
  expect(request.httpMethod).toBe("GET");
  expect(Object.fromEntries(request.headers.map(([name, value]) => [name.toLowerCase(), value]))).toMatchObject({
    accept: "text/html",
    "accept-encoding": "identity",
  });
  await pic.mockPendingHttpsOutcall({
    requestId: request.requestId,
    subnetId: request.subnetId,
    response: { type: "success", statusCode, body: new TextEncoder().encode(body), headers: [] },
  });
  const response = await client.awaitCall(submitted);
  return IDL.decode(method.retTypes, response.body)[0];
}

it("rejects non-admins and invalid slugs before creating an outcall", async () => {
  actor.setPrincipal(member);
  await expect(actor.readMyHomeListing(slug)).rejects.toThrow(/Only admins/);
  actor.setPrincipal(owner);
  await expect(actor.readMyHomeListing("https://example.com/listing-123")).rejects.toThrow(/valid MyHome listing/);
  await expect(actor.readMyHomeListing("room-without-property-id")).rejects.toThrow(/valid MyHome listing/);
  expect(await pic.getPendingHttpsOutcalls()).toHaveLength(0);
});

it("returns the listing HTML on success and rejects a blocked request", async () => {
  const html = "<html><title>Example property</title></html>";
  await expect(respondToImport(200, html)).resolves.toBe(html);
  await expect(respondToImport(403, "Cloudflare challenge")).rejects.toThrow(/MyHome blocked the direct request/);
});
