import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Building2,
  Check,
  CircleAlert,
  Pencil,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useRef, useState } from "react";
import { ListingEditor } from "./ListingEditor";
import { useMarketplace } from "./MarketplaceContext";
import { type PropertyListing, formatLocation, formatPrice } from "./catalog";
import { listingStatusLabels } from "./listing-editor-data";
import { useMyHomeImport } from "./myhome-import-service";

export function SellerPage() {
  const importMyHome = useMyHomeImport();
  const {
    ownedListings,
    ownedListingsLoading,
    ownedListingsError,
    retryOwnedListings,
    saveListing,
  } = useMarketplace();
  const [editor, setEditor] = useState<PropertyListing | "new" | undefined>();
  const [notice, setNotice] = useState("");
  const pageHeading = useRef<HTMLHeadingElement>(null);

  function closeEditor() {
    setEditor(undefined);
    pageHeading.current?.focus();
  }

  async function onSave(listing: PropertyListing) {
    await saveListing(listing);
    setNotice(
      listing.status === "draft"
        ? "Draft saved. Only admins can preview it."
        : "Listing saved to the marketplace.",
    );
    closeEditor();
  }

  function editListing(listing: PropertyListing | "new") {
    setNotice("");
    setEditor(listing);
  }

  return (
    <section
      className="market-container pt-9 pb-20 sm:pt-14"
      aria-labelledby="seller-heading"
    >
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="mb-3 text-[0.68rem] font-bold tracking-[0.2em] text-primary uppercase">
            Seller workspace
          </p>
          <h1
            id="seller-heading"
            ref={pageHeading}
            tabIndex={-1}
            className="font-editorial text-[clamp(2.7rem,6.5vw,5rem)] leading-none tracking-[-0.045em] focus:outline-none"
          >
            Manage properties
          </h1>
          <p className="mt-4 leading-relaxed text-base-content/70">
            Create listings, update asking prices, and manage availability from
            one place.
          </p>
        </div>
        {!editor && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => editListing("new")}
          >
            <Plus className="size-4" aria-hidden="true" /> New listing
          </button>
        )}
      </header>

      <div className="mt-6 flex items-start gap-2.5 rounded-box border border-base-300 bg-base-200 px-4 py-3 text-sm leading-relaxed text-base-content/75 sm:mt-8">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <p>
          Drafts are visible to admins in this workspace. Published listings
          appear in Explore.
        </p>
      </div>

      {!editor && notice && (
        <output className="alert alert-success alert-soft mt-4">
          <Check className="size-5" aria-hidden="true" /> {notice}
        </output>
      )}

      {editor ? (
        <ListingEditor
          key={editor === "new" ? editor : editor.id}
          listing={editor === "new" ? undefined : editor}
          importMyHome={importMyHome}
          onSave={onSave}
          onCancel={closeEditor}
        />
      ) : ownedListingsLoading ? (
        <output className="flex items-center gap-3 py-10 text-base-content/70">
          <span
            className="loading loading-spinner loading-sm text-primary"
            aria-hidden="true"
          />
          Loading listings…
        </output>
      ) : ownedListingsError ? (
        <div role="alert" className="alert alert-error alert-soft mt-8">
          <CircleAlert className="size-5" aria-hidden="true" />
          <p>Listings couldn’t be loaded.</p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={retryOwnedListings}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <dl className="mt-8 grid grid-cols-3 gap-2 sm:gap-4">
            {[
              ["All listings", ownedListings.length],
              [
                "Available",
                ownedListings.filter(({ status }) => status === "available")
                  .length,
              ],
              [
                "Drafts",
                ownedListings.filter(({ status }) => status === "draft").length,
              ],
            ].map(([label, count]) => (
              <div
                key={label}
                className="rounded-box border border-base-300 bg-base-100 p-3.5 sm:p-5"
              >
                <dt className="text-xs font-medium text-base-content/70 sm:text-sm">
                  {label}
                </dt>
                <dd className="mt-1 font-editorial text-3xl tracking-tight sm:text-4xl">
                  {count}
                </dd>
              </div>
            ))}
          </dl>

          <section className="mt-10" aria-labelledby="listing-management-title">
            <h2
              id="listing-management-title"
              className="mb-4 font-editorial text-3xl tracking-tight sm:text-4xl"
            >
              Manage listings
            </h2>
            {ownedListings.length ? (
              <ul className="divide-y divide-base-300 overflow-hidden rounded-box border border-base-300 bg-base-100">
                {ownedListings.map((listing) => (
                  <li
                    key={listing.id}
                    className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 p-3.5 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:gap-5 sm:p-4"
                  >
                    <div className="grid aspect-4/3 place-items-center overflow-hidden rounded-field bg-base-200 text-primary">
                      {listing.images[0] ? (
                        <img
                          src={listing.images[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2 className="size-6" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <h3 className="font-editorial text-xl leading-tight tracking-tight break-words sm:text-2xl">
                          {listing.title}
                        </h3>
                        <span
                          className={`badge badge-sm ${listing.status === "available" ? "badge-soft badge-success" : "badge-outline border-base-300 text-base-content/70"}`}
                        >
                          {listingStatusLabels[listing.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-base-content/70">
                        {formatLocation(listing)} · {formatPrice(listing.price)}
                      </p>
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center justify-end gap-1.5 sm:col-span-1">
                      <Link
                        to="/properties/$listingId"
                        params={{ listingId: listing.id }}
                        className="btn btn-ghost btn-sm"
                        aria-label={`Preview ${listing.title}`}
                      >
                        Preview{" "}
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm border-base-300"
                        aria-label={`Edit ${listing.title}`}
                        onClick={() => editListing(listing)}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" /> Edit
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center rounded-box border border-dashed border-base-300 bg-base-100 px-6 py-12 text-center sm:py-16">
                <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-editorial text-2xl tracking-tight sm:text-3xl">
                  Your first listing starts here
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-base-content/70">
                  Add a property, its asking price, and a few photos. Save a
                  draft or mark it available when you’re ready.
                </p>
                <button
                  type="button"
                  className="btn btn-outline mt-5 border-base-300"
                  onClick={() => editListing("new")}
                >
                  <Plus className="size-4" aria-hidden="true" /> Create a
                  listing
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
