import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { Ref } from "react";

export function PropertyPhotoDialog({
  images,
  imageDescriptions,
  title,
  activeIndex,
  onStep,
  dialogRef,
}: {
  images: string[];
  imageDescriptions?: string[];
  title: string;
  activeIndex: number;
  onStep: (offset: number) => void;
  dialogRef: Ref<HTMLDialogElement>;
}) {
  if (!images.length) return null;

  return (
    <dialog
      className="modal"
      aria-label={`${title} photo gallery`}
      ref={dialogRef}
      onKeyDown={(event) => {
        if (images.length < 2) return;
        if (event.key === "ArrowLeft") onStep(-1);
        if (event.key === "ArrowRight") onStep(1);
      }}
    >
      <div className="modal-box max-w-5xl bg-base-100 p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="truncate px-1 text-sm font-semibold">{title}</p>
          <form method="dialog">
            <button
              type="submit"
              className="btn btn-ghost btn-square btn-sm"
              aria-label="Close gallery"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </form>
        </div>
        <div className="relative grid h-[min(65vh,45rem)] place-items-center overflow-hidden rounded-box bg-base-200">
          <img
            className="h-full min-h-0 w-full object-contain"
            src={images[activeIndex] ?? images[0]}
            alt={imageDescriptions?.[activeIndex] || title}
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="absolute inset-y-0 left-0 w-1/2 cursor-pointer focus-visible:-outline-offset-4"
                aria-label="Previous photo"
                onClick={() => onStep(-1)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 w-1/2 cursor-pointer focus-visible:-outline-offset-4"
                aria-label="Next photo"
                onClick={() => onStep(1)}
              />
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onStep(-1)}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Previous
            </button>
            <p
              className="text-sm tabular-nums text-base-content/65"
              aria-live="polite"
            >
              {activeIndex + 1} of {images.length}
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onStep(1)}
            >
              Next
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop" aria-hidden="true">
        <button type="submit" tabIndex={-1}>
          Close gallery
        </button>
      </form>
    </dialog>
  );
}
