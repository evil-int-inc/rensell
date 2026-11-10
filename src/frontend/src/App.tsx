import { RequireAdmin, RequireAuth } from "@/components/auth/RequireAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { useI18n } from "@/i18n";
import { DiscoveryPage } from "@/marketplace/DiscoveryPage";
import { MarketplaceLayout } from "@/marketplace/MarketplaceLayout";
import { PropertyDetailPage } from "@/marketplace/PropertyDetailPage";
import { SavedPage } from "@/marketplace/SavedPage";
import { SellerPage } from "@/marketplace/SellerPage";
import {
  type DiscoveryFilters,
  emptyDiscoveryFilters,
  validateDiscoverySearch,
} from "@/marketplace/discovery-filters";
import { AdminPage } from "@/pages/AdminPage";
import { PlayersPage } from "@/pages/PlayersPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { TournamentDetailPage } from "@/pages/TournamentDetailPage";
import { TournamentsPage } from "@/pages/TournamentsPage";
import { UsersPage } from "@/pages/UsersPage";
import { validateBracketSearch } from "@/types/bracket-link";
import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import {
  Link,
  Outlet,
  RouterProvider,
  type SearchSchemaInput,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  stripSearchParams,
} from "@tanstack/react-router";

function MarketplaceNotFound() {
  return (
    <div className="market-container py-20">
      <p className="mb-3 text-xs font-bold tracking-widest text-primary">
        404 / PAGE NOT FOUND
      </p>
      <h1 className="font-editorial text-5xl tracking-tight">
        This page couldn’t be found.
      </h1>
      <Link to="/" className="btn btn-primary mt-6">
        Explore properties
      </Link>
    </div>
  );
}
const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: MarketplaceNotFound,
});
const marketplaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_marketplace",
  component: MarketplaceLayout,
});
const indexRoute = createRoute({
  getParentRoute: () => marketplaceRoute,
  path: "/",
  validateSearch: (search: Partial<DiscoveryFilters> & SearchSchemaInput) =>
    validateDiscoverySearch(search),
  search: { middlewares: [stripSearchParams(emptyDiscoveryFilters)] },
  component: DiscoveryPage,
});
const propertyRoute = createRoute({
  getParentRoute: () => marketplaceRoute,
  path: "/properties/$listingId",
  component: PropertyRoute,
});

function PropertyRoute() {
  const { listingId } = propertyRoute.useParams();
  return <PropertyDetailPage key={listingId} listingId={listingId} />;
}

const savedRoute = createRoute({
  getParentRoute: () => marketplaceRoute,
  path: "/saved",
  component: SavedPage,
});
const sellerRoute = createRoute({
  getParentRoute: () => marketplaceRoute,
  path: "/sell",
  component: () => (
    <RequireAdmin promptOnMount={false}>
      <SellerPage />
    </RequireAdmin>
  ),
});
const clubRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_club",
  component: MainLayout,
});
const playersRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "/players",
  component: PlayersPage,
});
const usersRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "/users",
  beforeLoad: () => {
    throw redirect({ to: "/players" });
  },
});
const tournamentsRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "/tournaments",
  component: TournamentsPage,
});
const tournamentDetailRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "/tournaments/$tournamentId",
  validateSearch: validateBracketSearch,
  component: TournamentRoomRoute,
});

function TournamentRoomRoute() {
  const { t } = useI18n();
  const { tournamentId } = tournamentDetailRoute.useParams();
  if (!/^\d+$/.test(tournamentId)) {
    return (
      <div className="club-page club-state">
        <h1 className="font-display text-3xl font-bold uppercase">
          {t("Tournament not found.")}
        </h1>
        <Link to="/tournaments" className="btn btn-primary mt-6">
          {t("Back to tournaments")}
        </Link>
      </div>
    );
  }
  return <TournamentDetailPage tournamentId={BigInt(tournamentId)} />;
}
const adminRoute = createRoute({
  getParentRoute: () => marketplaceRoute,
  path: "/admin",
  component: () => (
    <RequireAdmin promptOnMount={false}>
      <AdminPage marketplace />
    </RequireAdmin>
  ),
});
const accountsRoute = createRoute({
  getParentRoute: () => marketplaceRoute,
  path: "/admin/accounts",
  component: () => (
    <RequireAdmin promptOnMount={false}>
      <UsersPage marketplace />
    </RequireAdmin>
  ),
});
const profileRoute = createRoute({
  getParentRoute: () => marketplaceRoute,
  path: "/profile",
  component: () => (
    <RequireAuth>
      <ProfilePage marketplace />
    </RequireAuth>
  ),
});
const clubAdminRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "/tournaments/admin",
  component: () => (
    <RequireAdmin>
      <AdminPage />
    </RequireAdmin>
  ),
});
const clubAccountsRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "/tournaments/admin/accounts",
  component: () => (
    <RequireAdmin>
      <UsersPage />
    </RequireAdmin>
  ),
});
const clubProfileRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "/tournaments/profile",
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});
export const routeTree = rootRoute.addChildren([
  marketplaceRoute.addChildren([
    indexRoute,
    propertyRoute,
    savedRoute,
    sellerRoute,
    adminRoute,
    accountsRoute,
    profileRoute,
  ]),
  clubRoute.addChildren([
    playersRoute,
    usersRoute,
    tournamentsRoute,
    tournamentDetailRoute,
    clubAdminRoute,
    clubAccountsRoute,
    clubProfileRoute,
  ]),
]);
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
export default function App() {
  return (
    <InternetIdentityProvider>
      <RouterProvider router={router} />
    </InternetIdentityProvider>
  );
}
