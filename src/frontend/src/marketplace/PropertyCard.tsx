import { Link } from "@tanstack/react-router";
import { Bath, BedDouble, Heart, House, MapPin, Scan } from "lucide-react";
import {
  type PropertyListing,
  formatArea,
  formatLocation,
  formatPrice,
} from "./catalog";

type PropertyCardProps = {
  listing: PropertyListing;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
};

export function PropertyCard({
  listing,
  isFavorite,
  onToggleFavorite,
}: PropertyCardProps) {
  return (
    <article className="card group relative h-full overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm transition-shadow hover:shadow-md">
      <Link
        to="/properties/$listingId"
        params={{ listingId: listing.id }}
        className="flex h-full flex-col rounded-box focus-visible:-outline-offset-3"
      >
        <div className="relative isolate grid aspect-[1.53] place-items-center overflow-hidden bg-base-200">
          <House aria-hidden="true" className="size-10 text-base-content/35" />
          {listing.images[0] && (
            <img
              key={listing.images[0]}
              src={listing.images[0]}
              alt={listing.imageDescriptions?.[0] ?? ""}
              loading="lazy"
              decoding="async"
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
              className="absolute inset-0 size-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
            />
          )}
          <span className="badge absolute top-3.5 left-3.5 h-7 rounded-full border-base-100/50 bg-base-100/95 px-3 text-[11px] font-semibold text-base-content shadow-sm">
            {listing.type}
          </span>
        </div>
        <div className="flex grow flex-col px-4.5 pt-4.5 sm:px-5 sm:pt-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xl font-bold tracking-tight">
              {formatPrice(listing.price)}
            </p>
            {listing.demo && (
              <span className="badge badge-sm border-base-300 bg-base-200 text-base-content/70">
                Sample
              </span>
            )}
            {listing.status === "pending" && (
              <span className="badge badge-soft badge-warning">Pending</span>
            )}
            {listing.status === "sold" && (
              <span className="badge badge-soft badge-neutral">Sold</span>
            )}
          </div>
          <h3 className="mt-1.5 text-base font-semibold tracking-tight transition-colors group-hover:text-primary">
            {listing.title}
          </h3>
          <p className="mt-2 mb-4 flex items-center gap-1.5 text-sm text-base-content/65">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {formatLocation(listing)}
          </p>
          <ul className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-base-300 py-3.5 text-xs font-medium text-base-content/70 sm:gap-x-5">
            {listing.bedrooms !== undefined && (
              <li className="flex items-center gap-1.5">
                <BedDouble aria-hidden="true" className="size-4" />
                {listing.bedrooms === 0
                  ? "Studio"
                  : `${listing.bedrooms} ${listing.bedrooms === 1 ? "bed" : "beds"}`}
              </li>
            )}
            {listing.bathrooms !== undefined && (
              <li className="flex items-center gap-1.5">
                <Bath aria-hidden="true" className="size-4" />
                {listing.bathrooms} {listing.bathrooms === 1 ? "bath" : "baths"}
              </li>
            )}
            <li className="flex items-center gap-1.5">
              <Scan aria-hidden="true" className="size-4" />
              {formatArea(listing.areaM2)}
            </li>
          </ul>
        </div>
      </Link>
      <button
        type="button"
        className="btn btn-circle absolute top-3 right-3 size-10 border-base-100/50 bg-base-100/95 p-0 text-base-content shadow-sm hover:border-base-100 hover:bg-base-100 hover:text-primary"
        aria-label={`Save ${listing.title}`}
        aria-pressed={isFavorite}
        onClick={() => onToggleFavorite(listing.id)}
      >
        <Heart
          aria-hidden="true"
          className={
            isFavorite ? "size-[18px] fill-primary text-primary" : "size-[18px]"
          }
        />
      </button>
    </article>
  );
}

export default PropertyCard;
