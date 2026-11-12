import { useI18n } from "@/i18n";
import { formatBrowseCount } from "@/i18n/marketplace-browse";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  Bookmark,
  Building2,
  Check,
  CircleAlert,
  Grid2X2,
  House,
  LandPlot,
  Map as MapIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  Store,
  Trees,
  X,
} from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { ListingManagementActions } from "./ListingManagementActions";
import { useMarketplace } from "./MarketplaceContext";
import { PropertyCard } from "./PropertyCard";
import { PropertyMap } from "./PropertyMap";
import {
  type PropertyListing,
  formatLocation,
  formatPrice,
  propertyTypes,
} from "./catalog";
import {
  type DiscoveryFilters,
  emptyDiscoveryFilters,
  validateDiscoverySearch,
} from "./discovery-filters";

const priceOptions = [100_000, 200_000, 350_000, 500_000, 750_000, 1_000_000];
const sortOptions = {
  featured: "Featured first",
  recent: "Newest first",
  low: "Price: low to high",
  high: "Price: high to low",
  area: "Largest area",
};
type SortOrder = keyof typeof sortOptions;

const categories = [
  { value: "", label: "All properties", Icon: Grid2X2 },
  { value: "Apartment", label: "Apartments", Icon: Building2 },
  { value: "House", label: "Houses", Icon: House },
  { value: "Villa", label: "Villas", Icon: Trees },
  { value: "Commercial", label: "Commercial", Icon: Store },
  { value: "Land", label: "Land", Icon: LandPlot },
] as const;

function matchesSearch(listing: PropertyListing, filters: DiscoveryFilters) {
  const location =
    `${listing.city} ${listing.neighborhood} ${listing.address}`.toLowerCase();
  return (
    listing.status !== "draft" &&
    filters.location
      .toLowerCase()
      .split(/[,\s]+/)
      .every((term) => location.includes(term)) &&
    (!filters.propertyType || listing.type === filters.propertyType) &&
    (!filters.minPrice || listing.price >= Number(filters.minPrice)) &&
    (!filters.maxPrice || listing.price <= Number(filters.maxPrice)) &&
    (!filters.bedrooms ||
      (listing.bedrooms ?? 0) >= Number(filters.bedrooms)) &&
    (!filters.minArea || listing.areaM2 >= Number(filters.minArea)) &&
    (!filters.maxArea || listing.areaM2 <= Number(filters.maxArea))
  );
}

function sortListings(listings: PropertyListing[], order: SortOrder) {
  return listings.sort((first, second) => {
    if (order === "low") return first.price - second.price;
    if (order === "high") return second.price - first.price;
    if (order === "area") return second.areaM2 - first.areaM2;
    const byDate = Date.parse(second.listedAt) - Date.parse(first.listedAt);
    if (order === "recent") return byDate;
    return (
      Number(Boolean(second.featured)) - Number(Boolean(first.featured)) ||
      byDate
    );
  });
}

function DiscoveryHero({
  filters,
  locations,
  onSearch,
}: {
  filters: DiscoveryFilters;
  locations: string[];
  onSearch: (filters: DiscoveryFilters) => void;
}) {
  const { t } = useI18n();

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    onSearch(validateDiscoverySearch({ ...filters, ...fields }));
  }

  return (
    <section aria-labelledby="discovery-title" className="pt-5 sm:pt-7 lg:pt-8">
      <div className="relative isolate flex min-h-[20rem] overflow-hidden rounded-box bg-neutral text-neutral-content sm:min-h-[24rem] lg:min-h-[27rem]">
        <img
          src="/assets/properties/hero.webp"
          alt=""
          fetchPriority="high"
          className="absolute inset-0 -z-20 size-full object-cover object-[58%_52%] contrast-110 grayscale"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-r from-neutral/95 via-neutral/80 via-65% to-neutral/65 sm:via-60% sm:to-neutral/25 lg:via-54% lg:to-neutral/10" />
        <div className="flex max-w-3xl flex-col justify-center px-6 pt-9 pb-12 sm:px-11 sm:pb-20 lg:px-16">
          <h1
            id="discovery-title"
            className="font-editorial text-[clamp(2.5rem,12vw,3.5rem)] leading-[.94] font-semibold tracking-[-.06em] sm:text-[clamp(3.5rem,6.1vw,6.15rem)]"
          >
            {t("Find your next")}
            <br />
            <span className="font-normal">{t("chapter.")}</span>
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-neutral-content/90 sm:mt-6 sm:text-base">
            {t("Explore homes and investment properties in Tbilisi, Georgia.")}
          </p>
        </div>
      </div>

      <form
        key={JSON.stringify(filters)}
        onSubmit={search}
        aria-label={t("Search properties")}
        className="relative mx-auto -mt-5 grid max-w-5xl grid-cols-1 gap-1.5 rounded-box border border-base-300 bg-base-100 p-2.5 shadow-lg shadow-neutral/10 min-[370px]:grid-cols-2 sm:w-[calc(100%_-_4rem)] md:-mt-10 md:grid-cols-[minmax(0,1.28fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-0 md:p-3 md:ps-1"
      >
        <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 rounded-field px-3 py-2 focus-within:bg-base-200 min-[370px]:col-span-2 md:col-span-1 md:gap-x-3 md:rounded-none md:border-e md:border-base-300 md:px-4">
          <MapPin
            className="row-span-2 size-[1.1rem] text-primary"
            aria-hidden="true"
          />
          <span className="text-[.68rem] font-bold tracking-[.08em] uppercase">
            {t("Location")}
          </span>
          <input
            name="location"
            className="input input-ghost h-6 w-full border-0 p-0 text-sm shadow-none"
            placeholder={t("City or neighborhood")}
            autoComplete="off"
            defaultValue={filters.location}
            list="marketplace-locations"
          />
          <datalist id="marketplace-locations">
            {locations.map((location) => (
              <option key={location} value={location} />
            ))}
          </datalist>
        </label>
        <label className="grid min-w-0 gap-y-0.5 rounded-field px-3 py-2 focus-within:bg-base-200 md:rounded-none md:border-e md:border-base-300 md:px-4">
          <span className="text-[.68rem] font-bold tracking-[.08em] uppercase">
            {t("Property type")}
          </span>
          <select
            name="propertyType"
            defaultValue={filters.propertyType}
            className="select select-ghost h-6 w-full border-0 py-0 ps-0 text-sm shadow-none"
          >
            <option value="">{t("Any type")}</option>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>
                {t(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-y-0.5 rounded-field px-3 py-2 focus-within:bg-base-200 md:rounded-none md:px-4">
          <span className="text-[.68rem] font-bold tracking-[.08em] uppercase">
            {t("Max price")}
          </span>
          <select
            name="maxPrice"
            defaultValue={filters.maxPrice}
            className="select select-ghost h-6 w-full border-0 py-0 ps-0 text-sm shadow-none"
          >
            <option value="">
              {t(filters.minPrice ? "No maximum" : "Any price")}
            </option>
            {filters.maxPrice &&
              !priceOptions.includes(Number(filters.maxPrice)) && (
                <option value={filters.maxPrice}>
                  {t("Up to {value}", {
                    value: formatPrice(Number(filters.maxPrice)),
                  })}
                </option>
              )}
            {priceOptions.map((price) => (
              <option key={price} value={price}>
                {t("Up to {value}", { value: formatPrice(price) })}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="btn btn-primary min-h-11 gap-2.5 px-5 min-[370px]:col-span-2 md:col-span-1 md:min-h-[3.25rem] md:px-6"
        >
          <Search className="size-4" aria-hidden="true" />
          {t("Search properties")}
        </button>
      </form>
    </section>
  );
}

function AdvancedFilters({
  filters,
  dialogRef,
  onApply,
}: {
  filters: DiscoveryFilters;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  onApply: (filters: DiscoveryFilters) => void;
}) {
  const { locale, t } = useI18n();
  const numberFormat = new Intl.NumberFormat(locale);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const next = validateDiscoverySearch({ ...filters, ...fields });
    if (
      (next.maxPrice && Number(next.minPrice) > Number(next.maxPrice)) ||
      (next.maxArea && Number(next.minArea) > Number(next.maxArea))
    ) {
      setError("Minimum values must be less than or equal to maximum values.");
      return;
    }
    onApply(next);
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={() => {
        setError("");
        formRef.current?.reset();
      }}
      className="modal modal-bottom sm:modal-middle"
      aria-labelledby="discovery-filter-title"
    >
      <div className="modal-box border border-base-300 bg-base-100 p-6 sm:p-8">
        <button
          type="button"
          className="btn btn-ghost btn-square btn-sm absolute end-4 top-4"
          aria-label={t("Close filters")}
          onClick={() => dialogRef.current?.close()}
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <h2
          id="discovery-filter-title"
          className="font-editorial text-3xl tracking-tight"
        >
          {t("Refine your search")}
        </h2>
        <form
          key={JSON.stringify(filters)}
          ref={formRef}
          onSubmit={apply}
          className="mt-6 space-y-5"
        >
          <fieldset className="grid grid-cols-2 gap-3">
            <legend className="mb-2 text-sm font-semibold">
              {t("Price in USD")}
            </legend>
            <label className="grid gap-1.5 text-xs text-base-content/65">
              {t("Minimum price")}
              <input
                className="input w-full text-base-content"
                name="minPrice"
                type="number"
                min="0"
                defaultValue={filters.minPrice}
                placeholder={t("Any minimum")}
              />
            </label>
            <label className="grid gap-1.5 text-xs text-base-content/65">
              {t("Maximum price")}
              <input
                className="input w-full text-base-content"
                name="maxPrice"
                type="number"
                min="0"
                defaultValue={filters.maxPrice}
                placeholder={t("Any maximum")}
              />
            </label>
          </fieldset>
          <fieldset className="grid grid-cols-2 gap-3">
            <legend className="mb-2 text-sm font-semibold">
              {t("Area in m²")}
            </legend>
            <label className="grid gap-1.5 text-xs text-base-content/65">
              {t("Minimum area")}
              <input
                className="input w-full text-base-content"
                name="minArea"
                type="number"
                min="0"
                step="any"
                defaultValue={filters.minArea}
                placeholder={t("Any minimum")}
              />
            </label>
            <label className="grid gap-1.5 text-xs text-base-content/65">
              {t("Maximum area")}
              <input
                className="input w-full text-base-content"
                name="maxArea"
                type="number"
                min="0"
                step="any"
                defaultValue={filters.maxArea}
                placeholder={t("Any maximum")}
              />
            </label>
          </fieldset>
          <label className="grid gap-2 text-sm font-semibold">
            {t("Bedrooms")}
            <select
              name="bedrooms"
              defaultValue={filters.bedrooms}
              className="select w-full font-normal"
            >
              <option value="">{t("Any number")}</option>
              {[1, 2, 3, 4, 5, 6].map((number) => (
                <option key={number} value={number}>
                  {t("{count}+ bedrooms", {
                    count: numberFormat.format(number),
                  })}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p role="alert" className="text-sm text-error">
              {t(error)}
            </p>
          )}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => dialogRef.current?.close()}
            >
              {t("Cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              {t("Apply filters")}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop" aria-hidden="true">
        <button type="submit" tabIndex={-1}>
          {t("Close")}
        </button>
      </form>
    </dialog>
  );
}

export function DiscoveryPage() {
  const { language, locale, t } = useI18n();
  const numberFormat = new Intl.NumberFormat(locale);
  const {
    listings,
    listingsLoading,
    listingsError,
    canManageListings,
    retryListings,
    favorites,
    toggleFavorite,
    savedSearches,
    saveSearch,
  } = useMarketplace();
  const filters = useSearch({ from: "/_marketplace/" });
  const navigate = useNavigate({ from: "/" });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("featured");
  const [view, setView] = useState<"grid" | "map">("grid");
  const [selectedId, setSelectedId] = useState<string>();
  const filtered = sortListings(
    listings.filter((listing) => matchesSearch(listing, filters)),
    sortOrder,
  );
  const locations = Array.from(
    new Set(
      listings.flatMap((listing) => [listing.city, listing.neighborhood]),
    ),
  )
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second, locale));
  const active = Object.values(filters).some(Boolean);
  const saved = savedSearches.some((search) =>
    (Object.keys(emptyDiscoveryFilters) as (keyof DiscoveryFilters)[]).every(
      (key) => search[key] === filters[key],
    ),
  );
  const advancedCount = [
    filters.minPrice,
    filters.maxPrice,
    filters.minArea,
    filters.maxArea,
    filters.bedrooms,
  ].filter(Boolean).length;
  const hasPublishedListings = listings.length > 0;

  function applyFilters(next: DiscoveryFilters) {
    void navigate({ search: next, resetScroll: false });
  }

  function handleListingHidden(id: string) {
    setSelectedId((current) => (current === id ? undefined : current));
    resultsRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className="market-container pb-16 sm:pb-22">
      <DiscoveryHero
        filters={filters}
        locations={locations}
        onSearch={(next) => {
          applyFilters(next);
          resultsRef.current?.focus({ preventScroll: true });
          resultsRef.current?.scrollIntoView({ block: "start" });
        }}
      />
      <section
        ref={resultsRef}
        id="properties"
        tabIndex={-1}
        className="mt-10 scroll-mt-24 sm:mt-12"
        aria-labelledby="property-results-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-2 flex items-center gap-2.5 text-[.67rem] font-bold tracking-[.21em] text-primary uppercase">
              <span className="h-px w-5 bg-current" aria-hidden="true" />
              {t("The collection")}
            </p>
            <h2
              id="property-results-title"
              className="font-editorial text-4xl leading-[1.02] tracking-[-.04em] sm:text-5xl"
            >
              {t("Explore properties")}
            </h2>
          </div>
          <fieldset className="join rounded-field border border-base-300 bg-base-100 p-1">
            <legend className="sr-only">{t("Property display")}</legend>
            <button
              type="button"
              className={`btn join-item btn-sm gap-2 ${view === "grid" ? "btn-primary" : "btn-ghost"}`}
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <Grid2X2 className="size-4" aria-hidden="true" /> {t("Grid")}
            </button>
            <button
              type="button"
              className={`btn join-item btn-sm gap-2 ${view === "map" ? "btn-primary" : "btn-ghost"}`}
              aria-pressed={view === "map"}
              onClick={() => setView("map")}
            >
              <MapIcon className="size-4" aria-hidden="true" /> {t("Map")}
            </button>
          </fieldset>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-base-300 pb-4">
          <fieldset className="flex flex-wrap gap-1.5">
            <legend className="sr-only">{t("Property categories")}</legend>
            {categories.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                className={`btn btn-sm min-h-9 gap-2 px-3 ${filters.propertyType === value ? "btn-primary" : "btn-ghost border border-base-300"}`}
                aria-pressed={filters.propertyType === value}
                onClick={() =>
                  applyFilters({ ...filters, propertyType: value })
                }
              >
                <Icon className="size-4" aria-hidden="true" /> {t(label)}
              </button>
            ))}
          </fieldset>
          <button
            type="button"
            className="btn btn-sm btn-ghost min-h-9 gap-2 border border-base-300 px-3"
            onClick={() => dialogRef.current?.showModal()}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />{" "}
            {t("Filters")}
            {advancedCount > 0 && (
              <span className="badge badge-primary badge-xs">
                {numberFormat.format(advancedCount)}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 py-3.5 sm:py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p
              aria-live="polite"
              className="text-sm font-medium text-base-content/65"
            >
              {(!listingsLoading && !listingsError) || hasPublishedListings
                ? formatBrowseCount(
                    filtered.length,
                    "property",
                    language,
                    locale,
                  )
                : ""}
            </p>
            {active && (
              <button
                type="button"
                className="btn btn-ghost btn-xs gap-1.5 px-2"
                onClick={() => applyFilters(emptyDiscoveryFilters)}
              >
                <X className="size-3" aria-hidden="true" /> {t("Clear filters")}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {active && (
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-1.5 px-2 text-primary"
                disabled={saved}
                onClick={() => saveSearch(filters)}
              >
                {saved ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Bookmark className="size-4" aria-hidden="true" />
                )}
                {t(saved ? "Search saved" : "Save search")}
              </button>
            )}
            <label className="flex items-center gap-1.5">
              <ArrowDown
                className="size-3.5 text-base-content/65"
                aria-hidden="true"
              />
              <span className="sr-only">{t("Sort properties")}</span>
              <select
                className="select select-ghost select-sm w-auto min-w-0 ps-1 pe-6 font-medium"
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.currentTarget.value as SortOrder)
                }
              >
                {Object.entries(sortOptions).map(([value, label]) => (
                  <option key={value} value={value}>
                    {t(label)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {listingsError ? (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-box border border-base-300 bg-base-200 px-4 py-2.5"
          >
            <p className="flex items-start gap-2 text-sm text-base-content/80">
              <CircleAlert
                className="mt-0.5 size-4 shrink-0 text-warning"
                aria-hidden="true"
              />
              {t("Properties couldn’t be loaded.")}
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void retryListings()}
            >
              {t("Retry")}
            </button>
          </div>
        ) : listingsLoading ? (
          <output className="mb-4 flex items-center gap-2 text-sm text-base-content/65">
            <span
              className="loading loading-spinner loading-xs text-primary"
              aria-hidden="true"
            />
            {t("Loading properties…")}
          </output>
        ) : null}

        {filtered.length === 0 ? (
          !listingsLoading &&
          !listingsError && (
            <div className="rounded-box border border-dashed border-base-300 bg-base-200 px-6 py-14 text-center">
              <Search
                className="mx-auto mb-4 size-6 text-primary"
                aria-hidden="true"
              />
              <h3 className="font-editorial text-3xl">
                {t(
                  hasPublishedListings
                    ? "No matching properties"
                    : "No properties listed yet",
                )}
              </h3>
              <p className="mt-2 text-sm text-base-content/70">
                {t(
                  hasPublishedListings
                    ? "Try a broader location or adjust your price and property filters."
                    : "New listings will appear here when they’re published.",
                )}
              </p>
              {active && hasPublishedListings && (
                <button
                  type="button"
                  className="btn btn-primary mt-5"
                  onClick={() => applyFilters(emptyDiscoveryFilters)}
                >
                  {t("View all properties")}
                </button>
              )}
            </div>
          )
        ) : view === "map" ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)]">
            <div
              className="order-2 grid content-start gap-3 overflow-auto rounded-box lg:order-1 lg:max-h-[34rem]"
              aria-label={t("Properties on the map")}
            >
              {filtered.map((listing) => (
                <article
                  key={listing.id}
                  className={`grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 rounded-box border bg-base-100 p-2.5 ${selectedId === listing.id ? "border-primary" : "border-base-300"}`}
                >
                  <button
                    type="button"
                    className="relative grid aspect-square place-items-center overflow-hidden rounded-field bg-base-200 text-primary"
                    onClick={() => setSelectedId(listing.id)}
                    disabled={!listing.coordinates}
                    aria-label={t("Locate {title} on the map", {
                      title: listing.title,
                    })}
                  >
                    {listing.images[0] ? (
                      <img
                        src={listing.images[0]}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <MapPin className="size-5" aria-hidden="true" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-base-content/65">
                      {formatLocation(listing)}
                    </p>
                    <h3 className="mt-1 truncate font-editorial text-lg">
                      <Link
                        to="/properties/$listingId"
                        params={{ listingId: listing.id }}
                        className="hover:underline"
                      >
                        {listing.title}
                      </Link>
                    </h3>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">
                        {formatPrice(listing.price)}
                      </p>
                      <Link
                        to="/properties/$listingId"
                        params={{ listingId: listing.id }}
                        aria-label={t("View {title}", { title: listing.title })}
                        className="btn btn-ghost btn-xs btn-square"
                      >
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                  {canManageListings && (
                    <div className="col-span-2 border-t border-base-300 pt-2">
                      <ListingManagementActions
                        listing={listing}
                        small
                        onDrafted={() => handleListingHidden(listing.id)}
                        onRemoved={() => handleListingHidden(listing.id)}
                      />
                    </div>
                  )}
                </article>
              ))}
            </div>
            <div className="order-1 h-[28rem] min-w-0 lg:order-2 lg:h-[34rem]">
              <PropertyMap
                listings={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
                className="h-full"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {filtered.map((listing) => (
              <PropertyCard
                key={listing.id}
                listing={listing}
                isFavorite={favorites.includes(listing.id)}
                onToggleFavorite={toggleFavorite}
                showPhotoControls
                managementActions={
                  canManageListings && (
                    <ListingManagementActions
                      listing={listing}
                      small
                      onDrafted={() => handleListingHidden(listing.id)}
                      onRemoved={() => handleListingHidden(listing.id)}
                    />
                  )
                }
              />
            ))}
          </div>
        )}
      </section>
      <AdvancedFilters
        filters={filters}
        dialogRef={dialogRef}
        onApply={applyFilters}
      />
    </div>
  );
}
