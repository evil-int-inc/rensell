import { Link } from "@tanstack/react-router";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useMarketplace } from "./MarketplaceContext";
import type { PropertyListing } from "./catalog";

const confirmation = {
  draft: {
    title: "Make this ad a draft?",
    description:
      "The ad will disappear from public listings and Saved. You can publish it again from Manage properties.",
    confirm: "Make draft",
    pending: "Making draft…",
    error: "Couldn’t move the ad to drafts. Try again.",
    button: "btn-primary",
  },
  remove: {
    title: "Remove this ad?",
    description:
      "This permanently deletes the ad and its photos. It will disappear from public listings, Saved, and Manage properties.",
    confirm: "Remove permanently",
    pending: "Removing…",
    error: "Couldn’t remove the ad. Try again.",
    button: "btn-error",
  },
};
type Action = keyof typeof confirmation;

export function ListingManagementActions({
  listing,
  small,
  onEdit,
  onDrafted,
  onRemoved,
}: {
  listing: PropertyListing;
  small?: boolean;
  onEdit?: () => void;
  onDrafted?: () => void;
  onRemoved?: () => void;
}) {
  const { canManageListings, makeListingDraft, deleteListing } =
    useMarketplace();
  const [action, setAction] = useState<Action | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const dialogId = useId();

  useEffect(() => {
    if (!action || !canManageListings) return;
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    cancelButton.current?.focus();
    return () => {
      if (element.open) element.close();
    };
  }, [action, canManageListings]);

  if (!canManageListings) return null;

  function open(nextAction: Action) {
    setFailed(false);
    setAction(nextAction);
  }

  function close() {
    dialog.current?.close();
    setAction(null);
  }

  async function confirm() {
    if (!action || isWorking) return;
    setIsWorking(true);
    setFailed(false);
    try {
      if (action === "remove") await deleteListing(listing.id);
      else await makeListingDraft(listing.id);
      close();
      if (action === "remove") onRemoved?.();
      else onDrafted?.();
    } catch {
      setFailed(true);
    } finally {
      setIsWorking(false);
    }
  }

  const copy = action && confirmation[action];
  const buttonClass = small ? "btn btn-sm" : "btn";
  const editClass = `${buttonClass} btn-outline border-base-300`;
  const editLabel = `Edit ${listing.title}`;
  const editContent = (
    <>
      <Pencil className="size-4" aria-hidden="true" /> Edit
    </>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onEdit ? (
        <button
          type="button"
          className={editClass}
          aria-label={editLabel}
          onClick={onEdit}
        >
          {editContent}
        </button>
      ) : (
        <Link
          to="/properties/$listingId/edit"
          params={{ listingId: listing.id }}
          className={editClass}
          aria-label={editLabel}
        >
          {editContent}
        </Link>
      )}
      {listing.status !== "draft" && (
        <button
          type="button"
          className={`${buttonClass} btn-outline border-base-300`}
          aria-label={`Make draft: ${listing.title}`}
          onClick={() => open("draft")}
        >
          <FileText className="size-4" aria-hidden="true" /> Make draft
        </button>
      )}
      <button
        type="button"
        className={`${buttonClass} btn-outline btn-error`}
        aria-label={`Remove ${listing.title}`}
        onClick={() => open("remove")}
      >
        <Trash2 className="size-4" aria-hidden="true" /> Remove
      </button>

      {copy && (
        <dialog
          ref={dialog}
          className="modal"
          aria-labelledby={`${dialogId}-title`}
          aria-describedby={`${dialogId}-description`}
          aria-busy={isWorking}
          onCancel={(event) => {
            event.preventDefault();
            if (!isWorking) close();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            if (!isWorking) close();
          }}
        >
          <div className="modal-box max-w-md border border-base-300 bg-base-100 p-5 sm:p-7">
            <h2
              id={`${dialogId}-title`}
              className="font-editorial text-3xl leading-tight tracking-tight"
            >
              {copy.title}
            </h2>
            <p className="mt-3 font-semibold break-words">{listing.title}</p>
            <p
              id={`${dialogId}-description`}
              className="mt-2 text-sm leading-relaxed text-base-content/75"
            >
              {copy.description}
            </p>
            {failed && (
              <p role="alert" className="mt-4 text-sm text-error">
                {copy.error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                ref={cancelButton}
                type="button"
                className="btn btn-ghost"
                disabled={isWorking}
                onClick={close}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${copy.button}`}
                disabled={isWorking}
                onClick={confirm}
              >
                {isWorking ? copy.pending : copy.confirm}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
