import { useI18n } from "@/i18n";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bookmark, Heart, Trash2 } from "lucide-react";
import { useState } from "react";
import { useMarketplace } from "./MarketplaceContext";
import { PropertyCard } from "./PropertyCard";
import { formatArea, formatLocation, formatPrice } from "./catalog";

export function SavedPage() {
  const { locale, t } = useI18n();
  const numberFormat = new Intl.NumberFormat(locale);
  const { listings, favorites, savedSearches, toggleFavorite, removeSearch } =
    useMarketplace();
  const [comparison, setComparison] = useState<string[]>([]);
  const saved = listings.filter((listing) => favorites.includes(listing.id));
  const compared = saved.filter((listing) => comparison.includes(listing.id));

  return (
    <div className="market-container space-y-12 py-10 md:py-16">
      <div>
        <p className="mb-3 text-xs font-bold tracking-widest text-primary uppercase">
          {t("Your shortlist")}
        </p>
        <h1 className="font-editorial text-5xl tracking-tight sm:text-6xl">
          {t("Saved properties")}
        </h1>
        <p className="mt-4 max-w-xl text-base-content/75">
          {t(
            "Revisit the places that caught your eye and compare up to three properties side by side.",
          )}
        </p>
      </div>

      {saved.length > 0 ? (
        <section
          aria-label={t("Saved properties")}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {saved.map((listing) => (
            <div key={listing.id} className="flex flex-col gap-2">
              <PropertyCard
                listing={listing}
                isFavorite
                onToggleFavorite={(id) => {
                  toggleFavorite(id);
                  setComparison((current) =>
                    current.filter((item) => item !== id),
                  );
                }}
              />
              <label className="label min-h-10 cursor-pointer px-2 text-sm text-base-content/75">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  aria-label={t("Compare {title}", { title: listing.title })}
                  checked={comparison.includes(listing.id)}
                  disabled={
                    compared.length >= 3 && !comparison.includes(listing.id)
                  }
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setComparison((current) =>
                      checked
                        ? [...current, listing.id]
                        : current.filter((id) => id !== listing.id),
                    );
                  }}
                />
                {t("Compare")}
              </label>
            </div>
          ))}
        </section>
      ) : (
        <div className="rounded-box border border-base-300 bg-base-200 px-6 py-12 text-center">
          <Heart
            aria-hidden="true"
            className="mx-auto mb-4 size-7 text-primary"
          />
          <h2 className="font-editorial text-3xl">
            {t("Your shortlist starts here")}
          </h2>
          <p className="mt-2 text-sm text-base-content/75">
            {t("Select the heart on any property to save it here.")}
          </p>
          <Link to="/" className="btn btn-primary mt-5">
            {t("Explore properties")}
          </Link>
        </div>
      )}

      {compared.length >= 2 && (
        <section className="space-y-4" aria-labelledby="comparison-title">
          <h2
            id="comparison-title"
            className="font-editorial text-3xl tracking-tight"
          >
            {t("Compare properties")}
          </h2>
          <div className="overflow-x-auto rounded-box border border-base-300">
            <table className="table min-w-max">
              <thead className="bg-base-200 text-base-content">
                <tr>
                  <th scope="col">{t("Property")}</th>
                  {compared.map((listing) => (
                    <th scope="col" key={listing.id}>
                      <Link
                        to="/properties/$listingId"
                        params={{ listingId: listing.id }}
                        className="link link-hover text-primary"
                      >
                        {listing.title}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Price",
                    format: (listing: (typeof compared)[number]) =>
                      formatPrice(listing.price),
                  },
                  {
                    label: "Price per m²",
                    format: (listing: (typeof compared)[number]) =>
                      formatPrice(listing.price / listing.areaM2),
                  },
                  { label: "Location", format: formatLocation },
                  {
                    label: "Property type",
                    format: (listing: (typeof compared)[number]) =>
                      t(listing.type),
                  },
                  {
                    label: "Area",
                    format: (listing: (typeof compared)[number]) =>
                      formatArea(listing.areaM2),
                  },
                  {
                    label: "Bedrooms",
                    format: (listing: (typeof compared)[number]) =>
                      listing.bedrooms == null
                        ? "—"
                        : numberFormat.format(listing.bedrooms),
                  },
                  {
                    label: "Bathrooms",
                    format: (listing: (typeof compared)[number]) =>
                      listing.bathrooms == null
                        ? "—"
                        : numberFormat.format(listing.bathrooms),
                  },
                ].map(({ label, format }) => (
                  <tr key={label}>
                    <th scope="row">{t(label)}</th>
                    {compared.map((listing) => (
                      <td key={listing.id}>{format(listing)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section
        aria-labelledby="saved-search-title"
        className="space-y-4 border-t border-base-300 pt-8"
      >
        <h2
          id="saved-search-title"
          className="font-editorial text-3xl tracking-tight"
        >
          {t("Saved searches")}
        </h2>
        {savedSearches.length > 0 ? (
          <ul className="divide-y divide-base-300 rounded-box border border-base-300">
            {savedSearches.map(({ id, ...filters }) => {
              const description =
                [
                  filters.location,
                  t(filters.propertyType),
                  filters.minPrice &&
                    t("From {value}", {
                      value: formatPrice(Number(filters.minPrice)),
                    }),
                  filters.maxPrice &&
                    t("Up to {value}", {
                      value: formatPrice(Number(filters.maxPrice)),
                    }),
                  filters.bedrooms &&
                    t("{count}+ bedrooms", {
                      count: numberFormat.format(Number(filters.bedrooms)),
                    }),
                  filters.minArea &&
                    t("From {value}", {
                      value: formatArea(Number(filters.minArea)),
                    }),
                  filters.maxArea &&
                    t("Up to {value}", {
                      value: formatArea(Number(filters.maxArea)),
                    }),
                ]
                  .filter(Boolean)
                  .join(" · ") || t("All properties");
              return (
                <li
                  key={id}
                  className="flex items-center justify-between gap-2 p-3 sm:p-4"
                >
                  <Link
                    to="/"
                    search={filters}
                    hash="properties"
                    className="group flex min-w-0 items-center gap-2 text-sm font-semibold text-primary sm:gap-3"
                  >
                    <Bookmark
                      size={17}
                      className="shrink-0"
                      aria-hidden="true"
                    />
                    {description}
                    <ArrowRight
                      size={15}
                      className="shrink-0 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                  <button
                    type="button"
                    className="btn btn-ghost btn-circle btn-sm shrink-0 hover:text-error"
                    aria-label={t("Remove saved search: {description}", {
                      description,
                    })}
                    onClick={() => removeSearch(id)}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-base-content/75">
            {t(
              "Save a search from Explore to return to the same filters later.",
            )}
          </p>
        )}
      </section>
    </div>
  );
}
