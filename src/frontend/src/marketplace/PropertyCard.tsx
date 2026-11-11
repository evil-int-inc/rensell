import { Link } from "@tanstack/react-router";
import {
  Bath,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Heart,
  House,
  MapPin,
  Maximize2,
  Scan,
} from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { PropertyPhotoDialog } from "./PropertyPhotoDialog";
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
  managementActions?: ReactNode;
  showPhotoControls?: boolean;
};

const imageAspect = "aspect-[1.53]";
const photoButtonClass =
  "btn btn-circle pointer-events-auto absolute size-11 border-neutral-content/25 bg-neutral/75 p-0 text-neutral-content shadow-sm hover:border-neutral-content/40 hover:bg-neutral/90 focus-visible:outline-neutral-content";

export function PropertyCard({
  listing,
  isFavorite,
  onToggleFavorite,
  managementActions,
  showPhotoControls = false,
}: PropertyCardProps) {
  const photoDialog = useRef<HTMLDialogElement>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const photoCount = listing.images.length;
  const activeIndex = photoCount > 0 ? photoIndex % photoCount : 0;
  const activePhoto = listing.images[activeIndex];

  function stepPhoto(offset: number) {
    if (photoCount < 2) return;
    setPhotoIndex((index) => (index + offset + photoCount) % photoCount);
  }

  return (
    <article className="card group relative h-full overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm transition-shadow hover:shadow-md">
      <Link
        to="/properties/$listingId"
        params={{ listingId: listing.id }}
        className="flex grow flex-col rounded-box focus-visible:-outline-offset-3"
      >
        <div
          className={`relative isolate grid ${imageAspect} place-items-center overflow-hidden bg-base-200`}
        >
          <House aria-hidden="true" className="size-10 text-base-content/35" />
          {activePhoto && (
            <img
              key={activePhoto}
              src={activePhoto}
              alt={listing.imageDescriptions?.[activeIndex] ?? ""}
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
      {showPhotoControls && photoCount > 0 && (
        <>
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 z-10 ${imageAspect}`}
          >
            {photoCount > 1 && (
              <>
                <button
                  type="button"
                  className={`${photoButtonClass} top-1/2 left-2 -translate-y-1/2`}
                  aria-label="Previous photo"
                  onClick={() => stepPhoto(-1)}
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`${photoButtonClass} top-1/2 right-2 -translate-y-1/2`}
                  aria-label="Next photo"
                  onClick={() => stepPhoto(1)}
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              </>
            )}
            <output className="absolute bottom-3 left-3 rounded-full border border-neutral-content/25 bg-neutral/75 px-2.5 py-1 text-xs font-semibold text-neutral-content tabular-nums shadow-sm">
              {activeIndex + 1} / {photoCount}
            </output>
            <button
              type="button"
              className={`${photoButtonClass} right-2 bottom-2`}
              aria-label="Expand photos"
              aria-haspopup="dialog"
              onClick={() => photoDialog.current?.showModal()}
            >
              <Maximize2 className="size-4" aria-hidden="true" />
            </button>
          </div>
          <PropertyPhotoDialog
            dialogRef={photoDialog}
            title={listing.title}
            images={listing.images}
            imageDescriptions={listing.imageDescriptions}
            activeIndex={activeIndex}
            onStep={stepPhoto}
          />
        </>
      )}
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
      {managementActions && (
        <div className="border-t border-base-300 px-4.5 py-3 sm:px-5">
          {managementActions}
        </div>
      )}
    </article>
  );
}

export default PropertyCard;
