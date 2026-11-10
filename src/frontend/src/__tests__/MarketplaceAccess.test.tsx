import { routeTree } from "@/App";
import { setLanguage } from "@/i18n";
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
  },
}));

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: state.actor, isFetching: false }),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => state.auth }));

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
});

describe("marketplace permissions", () => {
  it.each(["visitor", "member", "role pending"] as const)(
    "shows the collapsed public sidebar without admin controls for a %s",
    async (account) => {
      if (account !== "visitor") signIn();
      if (account === "role pending") state.auth.roleLoading = true;
      renderMarketplace();

      expect(
        await screen.findByRole("heading", { name: "The Vake Residence" }),
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

  it.each(["/sell", "/admin", "/admin/accounts"])(
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

  it.each(["/sell", "/admin"])(
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

it("keeps sample properties browseable when live listings fail and supports retry", async () => {
  const user = userEvent.setup();
  state.actor.listProperties.mockRejectedValueOnce(
    new Error("Canister unavailable"),
  );
  renderMarketplace();

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Live listings are unavailable");
  expect(
    screen.getByRole("heading", { name: "The Vake Residence" }),
  ).toBeVisible();
  await user.click(within(alert).getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  expect(state.actor.listProperties).toHaveBeenCalledTimes(2);
});
