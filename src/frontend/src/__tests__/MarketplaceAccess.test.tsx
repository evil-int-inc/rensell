import { routeTree } from "@/App";
import { setLanguage } from "@/i18n";
import type { PropertyListing } from "@/marketplace/catalog";
import * as listingEditorData from "@/marketplace/listing-editor-data";
import { encodeListing } from "@/marketplace/property-records";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: {
    isAdmin: false,
    isAuthenticated: false,
    isInitializing: false,
    isLoggingIn: false,
    roleLoading: false,
    role: null as "admin" | null,
    principal: null as string | null,
    login: vi.fn(),
    logout: vi.fn(),
  },
  actor: {
    listProperties: vi.fn(),
    listManagedProperties: vi.fn(),
    publishProperty: vi.fn(),
    makePropertyDraft: vi.fn(),
    deleteProperty: vi.fn(),
    updateProperty: vi.fn(),
  },
}));

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: state.actor, isFetching: false }),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => state.auth }));

const publishedTitle = "Published apartment";
const publishedListing: PropertyListing = {
  id: "published-apartment",
  title: publishedTitle,
  description: "A published listing returned by the backend.",
  type: "Apartment",
  price: 150_000,
  neighborhood: "Vera",
  city: "Tbilisi",
  address: "Vera Park area",
  areaM2: 80,
  images: [],
  status: "available",
  listedAt: "2026-10-01",
  amenities: [],
  seller: { name: "Property seller", role: "Owner" },
};
const publishedProperty = encodeListing(publishedListing);
const publishedEditPath = `/properties/${publishedProperty.id}/edit`;

function renderMarketplace(path = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

function signIn(role: "admin" | null = null) {
  state.auth.isAuthenticated = true;
  state.auth.principal = "aaaaa-aa";
  state.auth.isAdmin = role === "admin";
  state.auth.role = role;
}

function expectNoAdminControls() {
  const sidebar = screen.getByRole("navigation", {
    name: "Sidebar navigation",
  });
  for (const name of ["Listings", "Admin", "Accounts"]) {
    expect(within(sidebar).queryByRole("link", { name })).toBeNull();
  }
  expect(screen.queryByRole("link", { name: "List a property" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Seller workspace" })).toBeNull();
  expect(screen.queryByRole("button", { name: /^Make draft:/ })).toBeNull();
  expect(
    screen.queryByRole("link", { name: `Edit ${publishedTitle}` }),
  ).toBeNull();
  expect(
    screen.queryByRole("button", { name: `Remove ${publishedTitle}` }),
  ).toBeNull();
  expect(state.actor.listManagedProperties).not.toHaveBeenCalled();
}

beforeEach(() => {
  localStorage.clear();
  setLanguage("en");
  state.auth.isAdmin = false;
  state.auth.isAuthenticated = false;
  state.auth.roleLoading = false;
  state.auth.role = null;
  state.auth.principal = null;
  state.auth.login.mockReset();
  state.auth.logout.mockReset();
  state.actor.listProperties.mockReset().mockResolvedValue([]);
  state.actor.listManagedProperties.mockReset().mockResolvedValue([]);
  state.actor.publishProperty.mockReset();
  state.actor.makePropertyDraft.mockReset();
  state.actor.deleteProperty.mockReset();
  state.actor.updateProperty.mockReset();
});

describe("marketplace permissions", () => {
  it.each(["visitor", "member", "role pending"] as const)(
    "shows the collapsed public sidebar without admin controls for a %s",
    async (account) => {
      if (account !== "visitor") signIn();
      if (account === "role pending") state.auth.roleLoading = true;
      state.actor.listProperties.mockResolvedValue([publishedProperty]);
      renderMarketplace();

      expect(
        await screen.findByRole("heading", { name: publishedTitle }),
      ).toBeVisible();
      const sidebar = screen.getByRole("navigation", {
        name: "Sidebar navigation",
      });
      expect(
        within(sidebar).getByRole("link", { name: "Explore" }),
      ).toHaveAttribute("href", "/");
      expect(
        within(sidebar).getByRole("link", { name: "Saved" }),
      ).toHaveAttribute("href", "/saved");
      expect(
        screen.getByRole("button", { name: "Expand sidebar" }),
      ).toHaveAttribute("aria-expanded", "false");
      expect(
        screen.getByRole("button", {
          name: account === "visitor" ? "Sign in" : "Sign out",
        }),
      ).toBeVisible();
      expectNoAdminControls();
    },
  );

  it.each(["/sell", "/admin", "/admin/accounts", publishedEditPath])(
    "requires an administrator for a direct visit to %s",
    async (path) => {
      signIn();
      renderMarketplace(path);

      expect(
        await screen.findByRole("heading", { name: "Admins only" }),
      ).toBeVisible();
      expect(screen.queryByRole("button", { name: "New listing" })).toBeNull();
      expectNoAdminControls();
    },
  );

  it.each(["/sell", "/admin", publishedEditPath])(
    "offers explicit sign-in to a visitor at %s",
    async (path) => {
      const user = userEvent.setup();
      renderMarketplace(path);

      expect(
        await screen.findByRole("heading", { name: "Admin sign-in" }),
      ).toBeVisible();
      expectNoAdminControls();
      expect(state.auth.login).not.toHaveBeenCalled();
      await user.click(
        screen.getByRole("button", { name: "Sign in with Internet Identity" }),
      );
      expect(state.auth.login).toHaveBeenCalledTimes(1);
    },
  );

  it("lets visitors expand and collapse the sidebar and open Saved", async () => {
    const user = userEvent.setup();
    renderMarketplace();

    const expand = await screen.findByRole("button", {
      name: "Expand sidebar",
    });
    const sidebar = screen.getByRole("navigation", {
      name: "Sidebar navigation",
    });
    expect(sidebar).toHaveAttribute("id", expand.getAttribute("aria-controls"));
    const saved = within(sidebar).getByRole("link", { name: "Saved" });
    expect(within(saved).getByText("Saved")).toHaveClass("sr-only");

    await user.click(expand);
    const collapse = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    expect(within(saved).getByText("Saved")).not.toHaveClass("sr-only");
    expectNoAdminControls();

    await user.click(collapse);
    expect(within(saved).getByText("Saved")).toHaveClass("sr-only");
    await user.click(saved);
    expect(
      await screen.findByRole("heading", { name: "Saved properties" }),
    ).toBeVisible();
  });

  it("opens and dismisses the mobile sidebar without changing the desktop rail", async () => {
    const user = userEvent.setup();
    renderMarketplace();

    const open = await screen.findByRole("button", { name: "Open sidebar" });
    expect(screen.queryByRole("dialog", { name: "Sidebar" })).toBeNull();
    await user.click(open);

    const drawer = screen.getByRole("dialog", { name: "Sidebar" });
    expect(drawer).toHaveAttribute("id", open.getAttribute("aria-controls"));
    const navigation = within(drawer).getByRole("navigation", {
      name: "Sidebar navigation",
    });
    expect(
      within(navigation).getByRole("link", { name: "Explore" }),
    ).toBeVisible();
    expect(
      within(navigation).queryByRole("link", { name: "Listings" }),
    ).toBeNull();
    await user.click(
      within(drawer).getByRole("button", { name: "Close sidebar" }),
    );
    expect(screen.queryByRole("dialog", { name: "Sidebar" })).toBeNull();

    await user.click(open);
    const reopened = screen.getByRole("dialog", { name: "Sidebar" });
    await user.click(within(reopened).getByRole("link", { name: "Saved" }));
    expect(
      await screen.findByRole("heading", { name: "Saved properties" }),
    ).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "Sidebar" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("shows protected sidebar entries to admins and opens listing creation", async () => {
    const user = userEvent.setup();
    signIn("admin");
    renderMarketplace();

    const sidebar = await screen.findByRole("navigation", {
      name: "Sidebar navigation",
    });
    expect(
      within(sidebar).getByRole("link", { name: "Admin" }),
    ).toHaveAttribute("href", "/admin");
    expect(
      within(sidebar).getByRole("link", { name: "Accounts" }),
    ).toHaveAttribute("href", "/admin/accounts");
    const listingLink = within(sidebar).getByRole("link", { name: "Listings" });
    await user.click(listingLink);

    expect(
      await screen.findByRole("heading", { name: "Manage properties" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "New listing" }));
    expect(
      screen.getByRole("textbox", { name: /Listing title/ }),
    ).toBeVisible();
    await waitFor(() =>
      expect(state.actor.listManagedProperties).toHaveBeenCalled(),
    );
  });
});

it("opens the full editor from Explore and saves ad details and replacement photos", async () => {
  const user = userEvent.setup();
  const oldCover = "data:image/jpeg;base64,b2xkLWNvdmVy";
  const keptPhoto = "data:image/jpeg;base64,a2VwdC1waG90bw==";
  const newPhoto = "data:image/jpeg;base64,bmV3LXBob3Rv";
  const preparePhoto = vi
    .spyOn(listingEditorData, "prepareListingPhoto")
    .mockResolvedValue(newPhoto);
  const source = {
    provider: "myhome" as const,
    id: "12345678",
    url: "https://www.myhome.ge/en/real-estate/apartment-for-sale-12345678/",
    facts: [
      { label: "Heating", value: "Gas" },
      { label: "Old note", value: "Outdated" },
    ],
  };
  let record = encodeListing({
    ...publishedListing,
    images: [oldCover, keptPhoto],
    imageDescriptions: ["Old cover", "Bedroom"],
    source,
  });
  state.actor.listProperties.mockImplementation(async () => [record]);
  state.actor.listManagedProperties.mockImplementation(async () => [record]);
  state.actor.updateProperty.mockImplementation(async (next) => {
    record = next;
  });
  signIn("admin");
  renderMarketplace();

  try {
    const edit = await screen.findByRole("link", {
      name: `Edit ${publishedTitle}`,
    });
    expect(edit).toHaveAttribute("href", publishedEditPath);
    await user.click(edit);

    const titleField = await screen.findByRole("textbox", {
      name: /Listing title/,
    });
    expect(titleField).toHaveValue(publishedTitle);
    await user.clear(titleField);
    const newTitle = "Updated apartment";
    await user.type(titleField, newTitle);
    await user.click(screen.getByRole("button", { name: "Remove photo 1" }));
    const keptDescription = screen.getByLabelText("Photo 1 description");
    expect(keptDescription).toHaveValue("Bedroom");
    await user.clear(keptDescription);
    await user.type(keptDescription, "Main bedroom");
    const file = new File(["photo"], "new-photo.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText(/Add property photos/), file);
    expect(
      await screen.findByRole("img", { name: "Listing view 2" }),
    ).toHaveAttribute("src", newPhoto);
    await user.click(
      screen.getByRole("checkbox", { name: "Featured listing" }),
    );
    const heating = screen.getByLabelText("Imported fact 1 value");
    await user.clear(heating);
    await user.type(heating, "Central heating");
    await user.click(
      screen.getByRole("button", { name: "Remove imported fact 2" }),
    );
    await user.click(screen.getByRole("button", { name: "Save listing" }));

    expect(
      await screen.findByRole("img", { name: "Main bedroom" }),
    ).toHaveAttribute("src", keptPhoto);
    expect(state.actor.updateProperty).toHaveBeenCalledTimes(1);
    expect(record.id).toBe(publishedListing.id);
    expect(record.isDraft).toBe(false);
    expect(JSON.parse(record.data)).toMatchObject({
      title: newTitle,
      images: [keptPhoto, newPhoto],
      imageDescriptions: ["Main bedroom", ""],
      featured: true,
      source: {
        ...source,
        facts: [{ label: "Heating", value: "Central heating" }],
      },
      listedAt: publishedListing.listedAt,
    });

    await user.click(screen.getByRole("link", { name: `Edit ${newTitle}` }));
    expect(
      await screen.findByRole("textbox", { name: /Listing title/ }),
    ).toHaveValue(newTitle);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      await screen.findByRole("link", { name: `Edit ${newTitle}` }),
    ).toBeVisible();
    expect(state.actor.updateProperty).toHaveBeenCalledTimes(1);
  } finally {
    preparePhoto.mockRestore();
  }
});

it("opens the same editor for a draft with no public record", async () => {
  const user = userEvent.setup();
  const draft = {
    ...publishedListing,
    title: "Unpublished ad",
    status: "draft",
  } as const;
  state.actor.listManagedProperties.mockResolvedValue([encodeListing(draft)]);
  signIn("admin");
  renderMarketplace(`/properties/${draft.id}`);

  await user.click(
    await screen.findByRole("link", { name: `Edit ${draft.title}` }),
  );
  expect(
    await screen.findByRole("textbox", { name: /Listing title/ }),
  ).toHaveValue(draft.title);
  expect(screen.getByLabelText("Availability")).toHaveValue("draft");
});

it("shows an empty catalog when no properties have been published", async () => {
  renderMarketplace();

  expect(
    await screen.findByRole("heading", { name: "No properties listed yet" }),
  ).toBeVisible();
});

it("reports an old sample property link as unavailable", async () => {
  renderMarketplace("/properties/vake-villa");

  expect(
    await screen.findByRole("heading", { name: "Property unavailable" }),
  ).toBeVisible();
});

it("cycles Explore card photos and opens the gallery at the selected photo", async () => {
  const user = userEvent.setup();
  const images = [
    "data:image/jpeg;base64,Y292ZXI=",
    "data:image/jpeg;base64,a2l0Y2hlbg==",
    "data:image/jpeg;base64,dGVycmFjZQ==",
  ];
  state.actor.listProperties.mockResolvedValue([
    encodeListing({
      ...publishedListing,
      images,
      imageDescriptions: ["Front elevation", "Kitchen", "Terrace"],
    }),
  ]);
  const router = renderMarketplace();

  const card = within(await screen.findByRole("article"));
  const previous = card.getByRole("button", { name: "Previous photo" });
  const next = card.getByRole("button", { name: "Next photo" });
  expect(card.getByText("1 / 3")).toBeVisible();
  expect(card.getByRole("img", { name: "Front elevation" })).toHaveAttribute(
    "src",
    images[0],
  );
  await user.click(previous);
  expect(card.getByText("3 / 3")).toBeVisible();
  expect(card.getByRole("img", { name: "Terrace" })).toHaveAttribute(
    "src",
    images[2],
  );
  await user.click(next);
  expect(card.getByText("1 / 3")).toBeVisible();
  await user.click(next);
  expect(card.getByText("2 / 3")).toBeVisible();
  expect(router.state.location.pathname).toBe("/");

  await user.click(card.getByRole("button", { name: "Expand photos" }));
  const gallery = within(
    screen.getByRole("dialog", { name: `${publishedTitle} photo gallery` }),
  );
  expect(gallery.getByRole("img", { name: "Kitchen" })).toHaveAttribute(
    "src",
    images[1],
  );
  const galleryNext = gallery.getByRole("button", { name: "Next photo" });
  await user.click(galleryNext);
  expect(gallery.getByRole("img", { name: "Terrace" })).toBeVisible();
  await user.click(galleryNext);
  expect(gallery.getByRole("img", { name: "Front elevation" })).toBeVisible();
  await user.click(gallery.getByRole("button", { name: "Previous photo" }));
  expect(gallery.getByRole("img", { name: "Terrace" })).toBeVisible();
  expect(router.state.location.pathname).toBe("/");
});

it("shows gallery controls appropriate to a card with one or zero photos", async () => {
  const user = userEvent.setup();
  const title = "Apartment with one photo";
  state.actor.listProperties.mockResolvedValue([
    publishedProperty,
    encodeListing({
      ...publishedListing,
      id: "one-photo-apartment",
      title,
      images: ["data:image/jpeg;base64,Y292ZXI="],
      imageDescriptions: ["Living room"],
    }),
  ]);
  renderMarketplace();

  const emptyCard = within(
    (await screen.findByRole("heading", { name: publishedTitle })).closest(
      "article",
    )!,
  );
  const singleCard = within(
    screen.getByRole("heading", { name: title }).closest("article")!,
  );
  for (const card of [emptyCard, singleCard]) {
    expect(card.queryByRole("button", { name: "Previous photo" })).toBeNull();
    expect(card.queryByRole("button", { name: "Next photo" })).toBeNull();
  }
  expect(emptyCard.queryByRole("img")).toBeNull();
  expect(emptyCard.queryByRole("button", { name: "Expand photos" })).toBeNull();
  expect(singleCard.getByText("1 / 1")).toBeVisible();

  await user.click(singleCard.getByRole("button", { name: "Expand photos" }));
  const gallery = within(
    screen.getByRole("dialog", { name: `${title} photo gallery` }),
  );
  expect(gallery.getByRole("img", { name: "Living room" })).toBeVisible();
  expect(gallery.queryByRole("button", { name: "Previous photo" })).toBeNull();
  expect(gallery.queryByRole("button", { name: "Next photo" })).toBeNull();
});

it("keeps listing management actions off the public ad page", async () => {
  state.actor.listProperties.mockResolvedValue([publishedProperty]);
  renderMarketplace(`/properties/${publishedProperty.id}`);

  expect(
    await screen.findByRole("heading", { name: publishedTitle }),
  ).toBeVisible();
  expectNoAdminControls();
});

it("reports a catalog failure and loads published properties after retry", async () => {
  const user = userEvent.setup();
  state.actor.listProperties
    .mockRejectedValueOnce(new Error("Canister unavailable"))
    .mockResolvedValueOnce([publishedProperty]);
  renderMarketplace();

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Properties couldn’t be loaded.");
  expect(screen.queryByRole("heading", { name: publishedTitle })).toBeNull();
  await user.click(within(alert).getByRole("button", { name: "Retry" }));
  expect(
    await screen.findByRole("heading", { name: publishedTitle }),
  ).toBeVisible();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(state.actor.listProperties).toHaveBeenCalledTimes(2);
});

it.each(["/sell", "/properties/draft-apartment"])(
  "publishes a draft from %s and refreshes the public catalog",
  async (path) => {
    const user = userEvent.setup();
    const title = "Draft apartment";
    let record = encodeListing({
      ...publishedListing,
      id: "draft-apartment",
      title,
      status: "draft",
    });
    state.actor.listProperties.mockImplementation(async () =>
      record.isDraft ? [] : [record],
    );
    state.actor.listManagedProperties.mockImplementation(async () => [record]);
    state.actor.publishProperty.mockImplementation(async () => {
      record = { ...record, isDraft: false };
    });
    signIn("admin");
    renderMarketplace(path);

    await user.click(
      await screen.findByRole("button", { name: `Publish ${title}` }),
    );

    await waitFor(() =>
      expect(state.actor.publishProperty).toHaveBeenCalledWith(record.id),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: `Publish ${title}` }),
      ).toBeNull(),
    );
    const sidebar = screen.getByRole("navigation", {
      name: "Sidebar navigation",
    });
    await user.click(within(sidebar).getByRole("link", { name: "Explore" }));
    expect(await screen.findByRole("heading", { name: title })).toBeVisible();
  },
);

it("confirms moving a public ad to drafts and removing it from its preview", async () => {
  const user = userEvent.setup();
  let record = { ...publishedProperty };
  let deleted = false;
  state.actor.listProperties.mockImplementation(async () =>
    deleted || record.isDraft ? [] : [record],
  );
  state.actor.listManagedProperties.mockImplementation(async () =>
    deleted ? [] : [record],
  );
  state.actor.makePropertyDraft.mockImplementation(async () => {
    record = { ...record, isDraft: true };
  });
  state.actor.deleteProperty
    .mockRejectedValueOnce(new Error("Canister unavailable"))
    .mockImplementation(async () => {
      deleted = true;
    });
  localStorage.setItem(
    "property-marketplace:v2",
    JSON.stringify({
      favorites: [record.id],
      savedSearches: [],
    }),
  );
  signIn("admin");
  renderMarketplace();

  const makeDraft = await screen.findByRole("button", {
    name: `Make draft: ${publishedTitle}`,
  });
  await user.click(makeDraft);
  const draftDialog = screen.getByRole("dialog", {
    name: "Make this ad a draft?",
  });
  expect(state.actor.makePropertyDraft).not.toHaveBeenCalled();
  await user.click(within(draftDialog).getByRole("button", { name: "Cancel" }));
  expect(makeDraft).toBeVisible();
  expect(state.actor.makePropertyDraft).not.toHaveBeenCalled();

  await user.click(makeDraft);
  await user.click(
    within(
      screen.getByRole("dialog", { name: "Make this ad a draft?" }),
    ).getByRole("button", { name: "Make draft" }),
  );
  expect(
    await screen.findByRole("heading", { name: "No properties listed yet" }),
  ).toBeVisible();
  expect(state.actor.makePropertyDraft).toHaveBeenCalledWith(record.id);

  const sidebar = screen.getByRole("navigation", {
    name: "Sidebar navigation",
  });
  await user.click(within(sidebar).getByRole("link", { name: "Saved" }));
  expect(
    await screen.findByRole("heading", { name: "Your shortlist starts here" }),
  ).toBeVisible();
  await user.click(within(sidebar).getByRole("link", { name: "Listings" }));
  await user.click(
    await screen.findByRole("link", { name: `Preview ${publishedTitle}` }),
  );
  expect(
    await screen.findByRole("button", { name: `Publish ${publishedTitle}` }),
  ).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: `Remove ${publishedTitle}` }),
  );
  const removeDialog = screen.getByRole("dialog", { name: "Remove this ad?" });
  expect(state.actor.deleteProperty).not.toHaveBeenCalled();
  await user.click(
    within(removeDialog).getByRole("button", { name: "Remove permanently" }),
  );
  expect(await within(removeDialog).findByRole("alert")).toHaveTextContent(
    "Couldn’t remove the ad",
  );
  await user.click(
    within(removeDialog).getByRole("button", { name: "Remove permanently" }),
  );
  expect(
    await screen.findByRole("heading", {
      name: "Your first listing starts here",
    }),
  ).toBeVisible();
  expect(state.actor.deleteProperty).toHaveBeenLastCalledWith(record.id);
});
