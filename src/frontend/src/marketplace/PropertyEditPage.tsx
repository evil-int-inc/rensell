import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ListingEditor } from "./ListingEditor";
import { useMarketplace } from "./MarketplaceContext";
import { useMyHomeImport } from "./myhome-import-service";

export function PropertyEditPage({ listingId }: { listingId: string }) {
  const navigate = useNavigate();
  const importMyHome = useMyHomeImport();
  const {
    ownedListings,
    ownedListingsLoading,
    ownedListingsError,
    retryOwnedListings,
    saveListing,
  } = useMarketplace();
  const listing = ownedListings.find(({ id }) => id === listingId);

  function returnToProperty() {
    return navigate({
      to: "/properties/$listingId",
      params: { listingId },
      replace: true,
    });
  }

  if (!listing) {
    return (
      <div className="market-container py-12 sm:py-16">
        {ownedListingsLoading ? (
          <output className="flex items-center gap-3 text-base-content/70">
            <span
              className="loading loading-spinner loading-sm text-primary"
              aria-hidden="true"
            />
            Loading property…
          </output>
        ) : (
          <>
            <h1 className="font-editorial text-4xl tracking-tight">
              {ownedListingsError
                ? "Property couldn’t be loaded"
                : "Property unavailable"}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {ownedListingsError && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={retryOwnedListings}
                >
                  Try again
                </button>
              )}
              <Link to="/sell" className="btn btn-outline border-base-300">
                Manage properties
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="market-container pt-6 pb-20 sm:pt-9">
      <Link
        to="/properties/$listingId"
        params={{ listingId }}
        replace
        className="inline-flex items-center gap-2 text-sm font-semibold text-base-content/70 hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to property
      </Link>
      <h1 className="mt-5 font-editorial text-4xl tracking-tight break-words sm:text-5xl">
        {listing.title}
      </h1>
      <ListingEditor
        listing={listing}
        importMyHome={importMyHome}
        onCancel={() => void returnToProperty()}
        onSave={async (updated) => {
          await saveListing(updated, true);
          await returnToProperty();
        }}
      />
    </div>
  );
}
