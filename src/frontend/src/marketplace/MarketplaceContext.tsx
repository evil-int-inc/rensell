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
import { type PropertyListing, sampleListings } from "./catalog";
import type { DiscoveryFilters } from "./discovery-filters";
import { encodeListing, fetchPropertyListings } from "./property-records";

export type SavedSearch = DiscoveryFilters & { id: string };

type SavedItems = {
  favorites: string[];
  savedSearches: SavedSearch[];
};

type MarketplaceContextValue = SavedItems & {
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
  saveListing(listing: PropertyListing): Promise<void>;
};

const storageKey = "property-marketplace:v2";
const previousStorageKey = "property-marketplace:v1";
const emptySavedItems: SavedItems = { favorites: [], savedSearches: [] };
const listingsKey = ["marketplace", "listings"] as const;
const sampleIds = new Set(sampleListings.map(({ id }) => id));
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

  const liveListings = (publicQuery.data ?? []).filter(
    (listing) => listing.status !== "draft",
  );
  const value: MarketplaceContextValue = {
    ...savedItems,
    listings: [
      ...liveListings,
      ...sampleListings.filter(
        (sample) => !liveListings.some(({ id }) => id === sample.id),
      ),
    ],
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
    async saveListing(listing) {
      if (!actor || isFetching || !isAdmin)
        throw new Error("Only admins can save listings.");
      if (sampleIds.has(listing.id))
        throw new Error("Sample listings cannot be edited.");
      await actor.saveProperty(encodeListing(listing));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listingsKey }),
        queryClient.invalidateQueries({ queryKey: managedKey }),
      ]);
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
