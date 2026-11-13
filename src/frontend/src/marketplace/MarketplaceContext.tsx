import { createActor } from "@/backend";
import { useAuth } from "@/hooks/useAuth";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { PropertyListing } from "./catalog";
import type { DiscoveryFilters } from "./discovery-filters";
import {
  fetchPropertyListings,
  prepareListingRecord,
} from "./property-records";

export type SavedSearch = DiscoveryFilters & { id: string };

type SavedItems = {
  favorites: string[];
  savedSearches: SavedSearch[];
};

type MarketplaceContextValue = SavedItems & {
  canManageListings: boolean;
  listings: PropertyListing[];
  listingsLoading: boolean;
  listingsError: boolean;
  ownedListings: PropertyListing[];
  ownedListingsLoading: boolean;
  ownedListingsError: boolean;
  storageError: string;
  retryListings(): void;
  retryOwnedListings(): void;
  toggleFavorite(id: string): void;
  saveSearch(filters: DiscoveryFilters): void;
  removeSearch(id: string): void;
  saveListing(listing: PropertyListing, editing: boolean): Promise<void>;
  publishListing(id: string): Promise<void>;
  makeListingDraft(id: string): Promise<void>;
  deleteListing(id: string): Promise<void>;
};

const storageKey = "property-marketplace:v2";
const previousStorageKey = "property-marketplace:v1";
const emptySavedItems: SavedItems = { favorites: [], savedSearches: [] };
const listingsKey = ["marketplace", "listings"] as const;
const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

function readSavedItems(): SavedItems {
  try {
    const stored =
      localStorage.getItem(storageKey) ??
      localStorage.getItem(previousStorageKey);
    if (stored) {
      const { favorites, savedSearches } = JSON.parse(stored);
      if (Array.isArray(favorites) && Array.isArray(savedSearches)) {
        return { favorites, savedSearches };
      }
    }
  } catch {
    return emptySavedItems;
  }
  return emptySavedItems;
}

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [savedItems, setSavedItems] = useState(readSavedItems);
  const [storageError, setStorageError] = useState("");
  const { actor, isFetching } = useActor(createActor);
  const { isAdmin, principal } = useAuth();
  const queryClient = useQueryClient();
  const managedKey = [
    "marketplace",
    "managed",
    isAdmin ? principal : null,
  ] as const;

  const publicQuery = useQuery({
    queryKey: listingsKey,
    queryFn: ({ signal }) => {
      if (!actor) throw new Error("The marketplace is still connecting.");
      return fetchPropertyListings(
        (after) => actor.listProperties(after),
        signal,
      );
    },
    enabled: !!actor && !isFetching,
  });
  const managedQuery = useQuery({
    queryKey: managedKey,
    queryFn: ({ signal }) => {
      if (!actor || !isAdmin)
        throw new Error("Only admins can manage listings.");
      return fetchPropertyListings(
        (after) => actor.listManagedProperties(after),
        signal,
      );
    },
    enabled: !!actor && !isFetching && isAdmin,
    gcTime: 0,
  });

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === storageKey || event.key === null)
        setSavedItems(readSavedItems());
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function saveFromBrowse(update: (previous: SavedItems) => SavedItems) {
    try {
      const next = update(readSavedItems());
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSavedItems(next);
      setStorageError("");
    } catch {
      setStorageError("Your changes could not be saved in this browser.");
    }
  }

  async function refreshListings() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: listingsKey }),
      queryClient.invalidateQueries({ queryKey: managedKey }),
    ]);
  }

  async function hideListing(id: string, keepDraft: boolean) {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: listingsKey }),
      queryClient.cancelQueries({ queryKey: managedKey }),
    ]);
    const withoutListing = (listings?: PropertyListing[]) =>
      listings?.filter((listing) => listing.id !== id);
    queryClient.setQueryData<PropertyListing[]>(listingsKey, withoutListing);
    queryClient.setQueryData<PropertyListing[]>(
      managedKey,
      keepDraft
        ? (listings) =>
            listings?.map((listing) =>
              listing.id === id ? { ...listing, status: "draft" } : listing,
            )
        : withoutListing,
    );
    void refreshListings();
  }

  const value: MarketplaceContextValue = {
    ...savedItems,
    canManageListings: isAdmin,
    listings: (publicQuery.data ?? []).filter(
      ({ status }) => status !== "draft",
    ),
    listingsLoading: !publicQuery.data && (isFetching || publicQuery.isLoading),
    listingsError: (!actor && !isFetching) || publicQuery.isError,
    ownedListings: isAdmin ? (managedQuery.data ?? []) : [],
    ownedListingsLoading:
      isAdmin && !managedQuery.data && (isFetching || managedQuery.isLoading),
    ownedListingsError:
      isAdmin && ((!actor && !isFetching) || managedQuery.isError),
    storageError,
    retryListings() {
      if (actor) void publicQuery.refetch();
      else window.location.reload();
    },
    retryOwnedListings() {
      if (actor && isAdmin) void managedQuery.refetch();
    },
    toggleFavorite(id) {
      saveFromBrowse((previous) => ({
        ...previous,
        favorites: previous.favorites.includes(id)
          ? previous.favorites.filter((favorite) => favorite !== id)
          : [...previous.favorites, id],
      }));
    },
    saveSearch(filters) {
      const id = JSON.stringify(Object.entries(filters).sort());
      saveFromBrowse((previous) =>
        previous.savedSearches.some((search) => search.id === id)
          ? previous
          : {
              ...previous,
              savedSearches: [...previous.savedSearches, { ...filters, id }],
            },
      );
    },
    removeSearch(id) {
      saveFromBrowse((previous) => ({
        ...previous,
        savedSearches: previous.savedSearches.filter(
          (search) => search.id !== id,
        ),
      }));
    },
    async saveListing(listing, editing) {
      if (!actor || isFetching || !isAdmin)
        throw new Error("Only admins can save listings.");
      const record = await prepareListingRecord(listing);
      if (editing) await actor.updateProperty(record);
      else await actor.saveProperty(record);
      await refreshListings();
    },
    async publishListing(id) {
      if (!actor || isFetching || !isAdmin)
        throw new Error("Only admins can publish listings.");
      await actor.publishProperty(id);
      await refreshListings();
    },
    async makeListingDraft(id) {
      if (!actor || isFetching || !isAdmin)
        throw new Error("Only admins can make listings drafts.");
      await actor.makePropertyDraft(id);
      await hideListing(id, true);
    },
    async deleteListing(id) {
      if (!actor || isFetching || !isAdmin)
        throw new Error("Only admins can remove listings.");
      await actor.deleteProperty(id);
      await hideListing(id, false);
      if (readSavedItems().favorites.includes(id)) {
        saveFromBrowse((previous) => ({
          ...previous,
          favorites: previous.favorites.filter((favorite) => favorite !== id),
        }));
      }
    },
  };

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const marketplace = useContext(MarketplaceContext);
  if (!marketplace) throw new Error("MarketplaceProvider is required.");
  return marketplace;
}
