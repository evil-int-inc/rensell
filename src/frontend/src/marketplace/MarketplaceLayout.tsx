import { useAuth } from "@/hooks/useAuth";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  LogIn,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import brand from "../../marketplace-brand.json";
import { themeService } from "../services/themeService";
import { MarketplaceProvider, useMarketplace } from "./MarketplaceContext";
import { MarketplaceSidebar } from "./MarketplaceSidebar";

function Brand({
  iconOnly = false,
  onNavigate,
}: { iconOnly?: boolean; onNavigate?: () => void }) {
  return (
    <Link
      to="/"
      search={{}}
      onClick={onNavigate}
      aria-label={`${brand.name} home`}
      className="inline-flex w-fit min-w-0 max-w-full items-center"
    >
      {iconOnly ? (
        <img
          src={brand.icon}
          alt=""
          width="36"
          height="36"
          className="size-9"
        />
      ) : (
        <>
          <img
            src={brand.logo}
            alt=""
            width="486"
            height="60"
            className="block h-auto w-32 max-w-full sm:w-40 [[data-theme=market-dark]_&]:hidden"
          />
          <img
            src={brand.logoInverse}
            alt=""
            width="486"
            height="60"
            className="hidden h-auto w-32 max-w-full sm:w-40 [[data-theme=market-dark]_&]:block"
          />
        </>
      )}
    </Link>
  );
}

const navClass =
  "btn btn-ghost btn-sm rounded-full text-base-content/70 hover:text-primary";
const navIconClass =
  "btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-primary";
const sidebarId = "market-sidebar-navigation";
const mobileSidebarId = "market-mobile-sidebar";
const sidebarStorageKey = "property-marketplace:sidebar-collapsed";

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(sidebarStorageKey) !== "false";
  } catch {
    return true;
  }
}

function MarketplaceHeader({
  auth,
  showAdmin,
  onSignOut,
  mobileSidebarOpen,
  onOpenSidebar,
}: {
  auth: ReturnType<typeof useAuth>;
  showAdmin: boolean;
  onSignOut: () => void;
  mobileSidebarOpen: boolean;
  onOpenSidebar: () => void;
}) {
  const [theme, setTheme] = useState(themeService.getMarketplaceTheme);

  useLayoutEffect(() => {
    themeService.apply(theme);
  }, [theme]);

  const dark = theme === "market-dark";
  return (
    <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100">
      <div className="market-container flex min-h-[4.25rem] items-center justify-between gap-2 md:min-h-[4.5rem]">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className={`${navIconClass} shrink-0 lg:hidden`}
            aria-label="Open sidebar"
            aria-haspopup="dialog"
            aria-controls={mobileSidebarId}
            aria-expanded={mobileSidebarOpen}
            onClick={onOpenSidebar}
          >
            <Menu size={21} aria-hidden="true" />
          </button>
          <Brand />
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2.5">
          <button
            type="button"
            className={navIconClass}
            aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
            onClick={() => {
              const next = dark ? "market-light" : "market-dark";
              themeService.saveMarketplaceTheme(next);
              setTheme(next);
            }}
          >
            {dark ? (
              <Sun size={17} aria-hidden="true" />
            ) : (
              <Moon size={17} aria-hidden="true" />
            )}
          </button>
          {showAdmin && (
            <Link
              to="/sell"
              className="btn btn-primary hidden h-10 rounded-full px-4 text-sm md:inline-flex"
            >
              <Plus size={17} aria-hidden="true" /> List a property
            </Link>
          )}
          {auth.isAuthenticated ? (
            <button
              type="button"
              className={navClass}
              aria-label="Sign out"
              title="Sign out"
              onClick={onSignOut}
            >
              <LogOut size={17} aria-hidden="true" />
              <span className="hidden md:inline">Sign out</span>
            </button>
          ) : (
            <button
              type="button"
              className={navClass}
              aria-label="Sign in"
              title="Sign in with Internet Identity"
              disabled={auth.isInitializing || auth.isLoggingIn}
              onClick={() => auth.login()}
            >
              <LogIn
                size={17}
                className="hidden min-[480px]:block"
                aria-hidden="true"
              />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function MarketplaceFooter({ showAdmin }: { showAdmin: boolean }) {
  return (
    <footer className="border-t border-base-300 bg-base-200">
      <div className="market-container flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:py-10">
        <div className="space-y-2">
          <Brand />
          <p className="text-sm text-base-content/70">
            Property discovery in Tbilisi, Georgia.
          </p>
        </div>
        {showAdmin && (
          <Link
            to="/sell"
            className="flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Seller workspace <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </footer>
  );
}

function MarketplaceFrame() {
  const { favorites, storageError } = useMarketplace();
  const auth = useAuth();
  const navigate = useNavigate();
  const showAdmin =
    auth.isAuthenticated &&
    auth.isAdmin &&
    !auth.isInitializing &&
    !auth.isLoggingIn &&
    !auth.roleLoading;
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mobileSidebar = useRef<HTMLDialogElement>(null);
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const sidebarProps = {
    showAdmin,
    showProfile: auth.isAuthenticated,
    favoriteCount: favorites.length,
  };

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const desktop = window.matchMedia?.("(min-width: 64rem)");
    if (!desktop) return;

    function closeAtDesktop(event: MediaQueryListEvent) {
      if (event.matches) mobileSidebar.current?.close();
    }

    desktop.addEventListener("change", closeAtDesktop);
    return () => desktop.removeEventListener("change", closeAtDesktop);
  }, [mobileSidebarOpen]);

  function openMobileSidebar() {
    mobileSidebar.current?.showModal();
    setMobileSidebarOpen(true);
  }

  function closeMobileSidebar() {
    mobileSidebar.current?.close();
    setMobileSidebarOpen(false);
  }

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(sidebarStorageKey, String(next));
    } catch {
      // The control works during the current visit when storage is disabled.
    }
  }

  async function signOut() {
    await navigate({ to: "/", search: {} });
    await auth.logout();
  }

  return (
    <div className="flex min-h-svh">
      <a
        href="#market-main"
        className="btn btn-primary sr-only z-50 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <div
        className={`hidden shrink-0 motion-safe:transition-[width] lg:block ${collapsed ? "w-[4.5rem]" : "w-56"}`}
      >
        <aside
          aria-label="Sidebar"
          className="sticky top-0 z-40 flex h-svh flex-col border-e border-base-300 bg-base-100"
        >
          <div
            className={`flex h-[4.25rem] shrink-0 items-center border-b border-base-300 md:h-[4.5rem] ${collapsed ? "justify-center" : "px-5"}`}
          >
            <Brand iconOnly={collapsed} />
          </div>
          <button
            type="button"
            className={`btn btn-ghost mt-2 min-h-11 focus-visible:-outline-offset-2 ${collapsed ? "mx-0.5 px-0 sm:mx-2" : "mx-3 justify-start px-3"}`}
            aria-label={toggleLabel}
            aria-controls={sidebarId}
            aria-expanded={!collapsed}
            title={toggleLabel}
            onClick={toggleSidebar}
          >
            {collapsed ? (
              <PanelLeftOpen size={19} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={19} aria-hidden="true" />
            )}
            {!collapsed && <span>Collapse</span>}
          </button>
          <MarketplaceSidebar
            {...sidebarProps}
            id={sidebarId}
            collapsed={collapsed}
          />
        </aside>
      </div>
      <dialog
        ref={mobileSidebar}
        id={mobileSidebarId}
        aria-label="Sidebar"
        className="modal items-stretch justify-items-start lg:hidden"
        onClose={() => setMobileSidebarOpen(false)}
      >
        <div className="modal-box flex h-dvh max-h-none w-[min(18rem,85vw)] max-w-none flex-col rounded-none border-e border-base-300 bg-base-100 p-0">
          <div className="flex h-[4.25rem] shrink-0 items-center justify-between border-b border-base-300 px-5 md:h-[4.5rem]">
            <Brand onNavigate={closeMobileSidebar} />
            <button
              type="button"
              className={navIconClass}
              aria-label="Close sidebar"
              onClick={closeMobileSidebar}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <MarketplaceSidebar
            {...sidebarProps}
            collapsed={false}
            onNavigate={closeMobileSidebar}
          />
        </div>
        <form method="dialog" className="modal-backdrop" aria-hidden="true">
          <button type="submit" tabIndex={-1}>
            Close
          </button>
        </form>
      </dialog>
      <div className="flex min-w-0 flex-1 flex-col">
        <MarketplaceHeader
          auth={auth}
          onSignOut={() => void signOut()}
          showAdmin={showAdmin}
          mobileSidebarOpen={mobileSidebarOpen}
          onOpenSidebar={openMobileSidebar}
        />
        <main id="market-main" className="flex-1" tabIndex={-1}>
          {storageError && (
            <div
              role="alert"
              className="alert alert-error market-container mt-4"
            >
              {storageError}
            </div>
          )}
          <Outlet />
        </main>
        <MarketplaceFooter showAdmin={showAdmin} />
      </div>
    </div>
  );
}

export function MarketplaceLayout() {
  return (
    <MarketplaceProvider>
      <MarketplaceFrame />
    </MarketplaceProvider>
  );
}
