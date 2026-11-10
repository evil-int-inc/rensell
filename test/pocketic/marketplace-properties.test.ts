import { createRequire } from "node:module";
import { type Actor, PocketIc, createIdentity } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";
import type {
  PropertyRecord,
  _SERVICE,
} from "../../src/frontend/src/declarations/backend.did";
import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";

const wasm = process.env.BACKEND_WASM!;
const owner = createIdentity("marketplace-owner").getPrincipal();
const member = createIdentity("marketplace-member").getPrincipal();
const require = createRequire(import.meta.url);
const picRequire = createRequire(require.resolve("@dfinity/pic"));
const anonymous: typeof owner = picRequire(
  "@icp-sdk/core/principal",
).Principal.anonymous();
let pic: PocketIc;
let canisterId: typeof owner;
let actor: Actor<_SERVICE>;

function property(id: string, isDraft = false): PropertyRecord {
  return { id, isDraft, data: JSON.stringify({ title: id }) };
}

beforeAll(async () => {
  pic = await PocketIc.create(process.env.POCKET_IC_URL!);
  ({ actor, canisterId } = await pic.setupCanister<_SERVICE>({ idlFactory, wasm }));
  actor.setPrincipal(owner);
  await actor._initialize_access_control();
  await actor.bootstrapOwner();
  actor.setPrincipal(member);
  await actor._initialize_access_control();
});

afterAll(async () => pic?.tearDown());

it("enforces the admin role for property writes and drafts through publishing and upgrade", async () => {
  const draft = property("listing-a", true);
  for (const caller of [anonymous, member]) {
    actor.setPrincipal(caller);
    await expect(actor.saveProperty(draft)).rejects.toThrow(/Only admins/);
    await expect(actor.listManagedProperties([])).rejects.toThrow(/Only admins/);
  }

  actor.setPrincipal(owner);
  await actor.grantAdminRole(member);
  actor.setPrincipal(member);
  await actor.saveProperty(draft);
  for (const suffix of ["b", "c", "d", "e", "f"]) {
    await actor.saveProperty(property(`listing-${suffix}`));
  }
  expect((await actor.listManagedProperties([]))[0]).toEqual(draft);

  actor.setPrincipal(anonymous);
  expect((await actor.listProperties([])).map(({ id }) => id)).toEqual([
    "listing-b", "listing-c", "listing-d", "listing-e",
  ]);
  expect(await actor.listProperties(["listing-e"])).toEqual([property("listing-f")]);

  actor.setPrincipal(member);
  await actor.saveProperty(property("listing-a"));
  actor.setPrincipal(owner);
  await actor.revokeAdminRole(member);
  actor.setPrincipal(member);
  await expect(actor.saveProperty(draft)).rejects.toThrow(/Only admins/);

  await pic.upgradeCanister({
    canisterId,
    wasm,
    upgradeModeOptions: {
      skip_pre_upgrade: [],
      wasm_memory_persistence: [{ keep: null }],
    },
  });
  actor.setPrincipal(anonymous);
  expect((await actor.listProperties([]))[0]).toEqual(property("listing-a"));
  actor.setPrincipal(owner);
  expect((await actor.listManagedProperties(["listing-d"])).map(({ id }) => id)).toEqual([
    "listing-e", "listing-f",
  ]);
});
