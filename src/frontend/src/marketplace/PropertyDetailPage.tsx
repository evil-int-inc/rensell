import { useI18n } from "@/i18n";
import { formatClubDate } from "@/i18n/date";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Bath,
  BedDouble,
  Building2,
  Check,
  Heart,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Share2,
  UserRound,
} from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { ListingManagementActions } from "./ListingManagementActions";
import { useMarketplace } from "./MarketplaceContext";
import { PropertyGallery } from "./PropertyGallery";
import { PropertyMap } from "./PropertyMap";
import { PublishListingButton } from "./PublishListingButton";
import { type PropertyListing, formatArea, formatPrice } from "./catalog";
import { listingStatusLabels } from "./listing-editor-data";

function formatListingDate(value: string) {
  return formatClubDate(new Date(value), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function DetailSection({
  id,
  title,
  children,
}: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 border-t border-base-300 pt-7 sm:pt-9"
    >
      <h2
        id={`${id}-title`}
        className="font-editorial text-3xl leading-tight tracking-tight sm:text-4xl"
      >
        {title}
      </h2>
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

function SellerContact({ listing }: { listing: PropertyListing }) {
  const { t } = useI18n();
  const { seller } = listing;
  const email = seller.email
    ? `mailto:${encodeURIComponent(seller.email).replace("%40", "@")}`
    : undefined;
  const telephone = seller.phone?.replace(/[^\d+]/g, "");
  const inquirySubject = t("Inquiry about {title}", { title: listing.title });
  const viewingSubject = t("Viewing request for {title}", {
    title: listing.title,
  });
  const viewingBody = t(
    "Hello {name},\n\nI would like to arrange a viewing of {title}. My preferred times are:\n\n",
    { name: seller.name, title: listing.title },
  );

  return (
    <div className="card border border-base-300 bg-base-100 p-6 shadow-sm sm:p-7">
      <p className="text-[0.68rem] font-bold tracking-[0.18em] text-base-content/65 uppercase">
        {t("Listed by")}
      </p>
      <div className="mt-5 flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <UserRound className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-lg leading-tight font-semibold">{seller.name}</p>
          <p className="mt-1 text-sm text-base-content/65">
            {["Owner", "Real estate agent", "Property developer"].includes(
              seller.role,
            )
              ? t(seller.role)
              : seller.role}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-2.5">
        {email && (
          <a
            className="btn btn-primary w-full"
            href={`${email}?subject=${encodeURIComponent(inquirySubject)}`}
          >
            <Mail className="size-4" aria-hidden="true" /> {t("Contact seller")}
          </a>
        )}
        {email && listing.status === "available" && (
          <a
            className="btn btn-outline w-full"
            href={`${email}?subject=${encodeURIComponent(viewingSubject)}&body=${encodeURIComponent(viewingBody)}`}
          >
            {t("Request a viewing")}{" "}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        )}
        {telephone && (
          <a
            className={`btn w-full ${email ? "btn-ghost" : "btn-primary"}`}
            href={`tel:${telephone}`}
          >
            <Phone className="size-4" aria-hidden="true" /> {seller.phone}
          </a>
        )}
        {!email && !telephone && (
          <p className="text-sm text-base-content/70">
            {t("The seller hasn’t added contact details yet.")}
          </p>
        )}
      </div>
    </div>
  );
}

export function PropertyDetailPage({ listingId }: { listingId: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const {
    listings,
    listingsLoading,
    listingsError,
    retryListings,
    ownedListings,
    ownedListingsLoading,
    ownedListingsError,
    retryOwnedListings,
    favorites,
    toggleFavorite,
  } = useMarketplace();
  const [shareState, setShareState] = useState<"idle" | "copied" | "show-link">(
    "idle",
  );
  const titleHeading = useRef<HTMLHeadingElement>(null);
  const listing =
    ownedListings.find((item) => item.id === listingId) ??
    listings.find((item) => item.id === listingId);

  if (!listing) {
    if (listingsLoading || ownedListingsLoading) {
      return (
        <output className="mx-auto flex max-w-2xl items-center justify-center gap-3 px-6 py-24 text-base-content/70 sm:py-32">
          <span
            className="loading loading-spinner loading-sm text-primary"
            aria-hidden="true"
          />
          {t("Loading property…")}
        </output>
      );
    }

    const loadFailed = listingsError || ownedListingsError;
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center sm:py-32">
        <span className="grid size-16 place-items-center rounded-full bg-base-200 text-primary">
          <Building2 className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-editorial text-4xl tracking-tight sm:text-5xl">
          {t(
            loadFailed ? "Property couldn’t be loaded" : "Property unavailable",
          )}
        </h1>
        <p className="mt-4 text-base-content/70">
          {t(
            loadFailed
              ? "There was a problem loading the listing. Please try again."
              : "This listing may have moved or been taken off the market.",
          )}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {loadFailed && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (listingsError) retryListings();
                if (ownedListingsError) retryOwnedListings();
              }}
            >
              {t("Try again")}
            </button>
          )}
          <Link
            to="/"
            className={`btn ${loadFailed ? "btn-outline" : "btn-primary"}`}
          >
            {t("Explore properties")}
          </Link>
        </div>
      </div>
    );
  }

  const isDraft = listing.status === "draft";
  const isFavorite = favorites.includes(listing.id);
  const pricePerArea = listing.areaM2
    ? formatPrice(Math.round(listing.price / listing.areaM2))
    : undefined;
  const address = [listing.address, listing.neighborhood, listing.city]
    .filter(Boolean)
    .join(", ");
  const mapQuery = listing.coordinates
    ? `${listing.coordinates.latitude},${listing.coordinates.longitude}`
    : address;
  const features = [
    { icon: Ruler, name: "Total area", value: formatArea(listing.areaM2) },
    { icon: BedDouble, name: "Bedrooms", value: listing.bedrooms },
    { icon: Bath, name: "Bathrooms", value: listing.bathrooms },
    { icon: Building2, name: "Property type", value: t(listing.type) },
  ];
  const specifications = (
    [
      [
        "Living area",
        listing.livingAreaM2 == null
          ? undefined
          : formatArea(listing.livingAreaM2),
      ],
      ["Rooms", listing.rooms],
      [
        "Floor",
        listing.floor != null && listing.totalFloors
          ? t("{current} of {total}", {
              current: listing.floor,
              total: listing.totalFloors,
            })
          : listing.floor,
      ],
      [
        "Building floors",
        listing.floor == null ? listing.totalFloors : undefined,
      ],
      ["Building type", listing.buildingType],
      ["Built in", listing.builtYear],
      ["Condition", listing.condition],
    ] as const
  ).filter(([, value]) => value != null && value !== "");

  async function shareListing() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing?.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareState("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareState("show-link");
    }
  }

  return (
    <article className="market-container pt-6 pb-20 sm:pt-9">
      <Link
        to={isDraft ? "/sell" : "/"}
        className="inline-flex items-center gap-2 text-sm font-semibold text-base-content/70 hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />{" "}
        {t(isDraft ? "Seller workspace" : "Explore properties")}
      </Link>

      <header className="mt-7 flex flex-wrap items-end justify-between gap-x-7 gap-y-5 pb-6 sm:mt-9 sm:pb-8">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="badge badge-soft badge-primary">
              {t(listing.type)}
            </span>
            <span
              className={`badge ${listing.status === "available" ? "badge-soft badge-success" : "badge-outline"}`}
            >
              {t(listingStatusLabels[listing.status])}
            </span>
          </div>
          <h1
            ref={titleHeading}
            tabIndex={-1}
            className="max-w-[17ch] font-editorial text-[clamp(2.5rem,5.4vw,4.6rem)] leading-[0.98] tracking-[-0.045em] break-words focus:outline-none"
          >
            {listing.title}
          </h1>
          <p className="mt-4 flex items-start gap-2 text-sm text-base-content/70 sm:text-base">
            <MapPin
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>{address}</span>
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {isDraft ? (
            <PublishListingButton id={listing.id} title={listing.title} />
          ) : (
            <>
              <button
                type="button"
                className="btn btn-outline border-base-300"
                onClick={shareListing}
              >
                {shareState === "copied" ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Share2 className="size-4" aria-hidden="true" />
                )}
                <span aria-live="polite">
                  {t(shareState === "copied" ? "Link copied" : "Share")}
                </span>
              </button>
              <button
                type="button"
                className={`btn btn-outline ${isFavorite ? "border-primary text-primary" : "border-base-300"}`}
                aria-pressed={isFavorite}
                onClick={() => toggleFavorite(listing.id)}
              >
                <Heart
                  className={`size-4 ${isFavorite ? "fill-current" : ""}`}
                  aria-hidden="true"
                />
                {t(isFavorite ? "Saved" : "Save property")}
              </button>
            </>
          )}
          <ListingManagementActions
            listing={listing}
            onDrafted={() => titleHeading.current?.focus()}
            onRemoved={() => {
              void navigate({ to: isDraft ? "/sell" : "/", replace: true });
            }}
          />
        </div>
        {!isDraft && shareState === "show-link" && (
          <label className="flex w-full max-w-md flex-col gap-2 text-sm font-semibold">
            {t("Copy this property link")}
            <input
              className="input w-full font-normal"
              readOnly
              value={window.location.href}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
        )}
      </header>

      <PropertyGallery
        key={listing.id}
        images={listing.images}
        imageDescriptions={listing.imageDescriptions}
        title={listing.title}
      />

      <div className="mt-8 grid items-start gap-10 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.44fr)] lg:gap-16">
        <div className="contents lg:block lg:space-y-12">
          <div className="order-1">
            <p className="text-[0.68rem] font-bold tracking-[0.18em] text-base-content/65 uppercase">
              {t("Asking price · USD")}
            </p>
            <p className="mt-1 font-editorial text-5xl leading-none tracking-tight">
              {formatPrice(listing.price)}
            </p>
            {pricePerArea && (
              <p className="mt-2 text-sm text-base-content/65">
                {t("{price} per m²", { price: pricePerArea })}
              </p>
            )}
            <dl className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {features
                .filter(({ value }) => value != null)
                .map(({ icon: Icon, name, value }) => (
                  <div
                    key={name}
                    className="rounded-box border border-base-300 bg-base-100 p-3.5 sm:p-4"
                  >
                    <Icon
                      className="mb-3 size-5 text-primary"
                      aria-hidden="true"
                    />
                    <dt className="text-xs text-base-content/65">{t(name)}</dt>
                    <dd className="mt-1 text-sm font-semibold sm:text-base">
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>

          <div className="order-3 min-w-0 space-y-9 sm:space-y-12">
            <DetailSection id="description" title={t("About this property")}>
              <p className="max-w-prose leading-relaxed whitespace-pre-line text-base-content/75">
                {listing.description}
              </p>
              <dl className="mt-5 grid max-w-2xl grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-3">
                {specifications.map(([label, value]) => (
                  <div key={label} className="border-t border-base-300 pt-3">
                    <dt className="text-base-content/65">{t(label)}</dt>
                    <dd className="mt-1 font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </DetailSection>

            {listing.amenities.length > 0 && (
              <DetailSection id="amenities" title={t("Features and amenities")}>
                <ul className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
                  {listing.amenities.map((amenity) => (
                    <li
                      key={amenity}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />{" "}
                      {amenity}
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}

            <DetailSection id="location" title={t("Explore the location")}>
              <p className="mb-4 text-sm text-base-content/70">{address}</p>
              {listing.coordinates && (
                <PropertyMap
                  listings={[listing]}
                  selectedId={listing.id}
                  showSummary={false}
                  className="min-h-80"
                />
              )}
              <a
                className="btn btn-outline mt-4 border-base-300"
                href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(mapQuery)}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("Open in OpenStreetMap")}{" "}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </DetailSection>

            {!!listing.priceHistory?.length && (
              <DetailSection id="price-history" title={t("Price history")}>
                <ul className="max-w-md divide-y divide-base-300 rounded-box border border-base-300">
                  {listing.priceHistory.map(({ date, price }) => (
                    <li
                      key={`${date}-${price}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <time dateTime={date} className="text-base-content/70">
                        {formatListingDate(date)}
                      </time>
                      <span className="font-semibold">
                        {formatPrice(price)}
                      </span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}

            {listing.source && (
              <DetailSection id="source" title={t("Original listing")}>
                <a
                  href={listing.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link inline-flex items-center gap-1 text-sm font-semibold text-primary"
                >
                  {t("MyHome listing {id}", { id: listing.source.id })}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
                {!!listing.source.facts?.length && (
                  <dl className="mt-5 grid max-w-2xl gap-4 text-sm sm:grid-cols-2">
                    {listing.source.facts.map(({ label, value }) => (
                      <div
                        key={`${label}:${value}`}
                        className="border-t border-base-300 pt-3"
                      >
                        <dt className="text-base-content/65">{label}</dt>
                        <dd className="mt-1 font-semibold">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </DetailSection>
            )}
          </div>
        </div>

        <aside
          className="order-2 grid gap-4 lg:sticky lg:top-28"
          aria-label={t("Seller information")}
        >
          <SellerContact listing={listing} />
          <div className="flex items-center justify-between gap-3 rounded-box border border-base-300 px-5 py-4 text-xs text-base-content/70">
            <p>
              {t("Listed")}{" "}
              <time dateTime={listing.listedAt}>
                {formatListingDate(listing.listedAt)}
              </time>
            </p>
            <a
              href="#location"
              className="inline-flex items-center gap-1.5 font-semibold text-primary"
            >
              {t("Location")}{" "}
              <ArrowDownRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </aside>
      </div>
    </article>
  );
}
