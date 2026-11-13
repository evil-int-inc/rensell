import { useI18n } from "@/i18n";
import { ImageOff, Images } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PropertyPhotoDialog } from "./PropertyPhotoDialog";

export function PropertyGallery({
  images,
  imageDescriptions,
  title,
  openOnLoad,
}: {
  images: string[];
  imageDescriptions?: string[];
  title: string;
  openOnLoad?: boolean;
}) {
  const { t } = useI18n();
  const gallery = useRef<HTMLDialogElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasImages = images.length > 0;

  useEffect(() => {
    const dialog = gallery.current;
    if (openOnLoad && hasImages && dialog && !dialog.open) {
      setActiveIndex(0);
      dialog.showModal();
    }
  }, [openOnLoad, hasImages]);

  function openGallery(index: number) {
    setActiveIndex(index);
    gallery.current?.showModal();
  }

  function stepGallery(offset: number) {
    setActiveIndex((index) => (index + offset + images.length) % images.length);
  }

  if (!hasImages) {
    return (
      <div className="flex aspect-2/1 flex-col items-center justify-center gap-3 rounded-box bg-base-200 text-base-content/65">
        <ImageOff className="size-8" aria-hidden="true" />
        <p className="text-sm">{t("Photography is coming soon")}</p>
      </div>
    );
  }

  return (
    <>
      <div
        className={`grid gap-2 overflow-hidden rounded-box ${images.length > 1 ? "md:grid-cols-[2fr_1fr]" : ""}`}
      >
        <div
          className={`relative aspect-4/3 overflow-hidden bg-base-200 sm:aspect-2/1 ${images.length === 1 ? "md:aspect-[2.65/1]" : ""}`}
        >
          <button
            type="button"
            className="group absolute inset-0 w-full"
            onClick={() => openGallery(0)}
            aria-label={t("Open property photo gallery")}
          >
            <img
              className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-105"
              src={images[0]}
              alt={imageDescriptions?.[0] || title}
              fetchPriority="high"
            />
          </button>
          <button
            type="button"
            onClick={() => openGallery(0)}
            className="btn btn-sm absolute right-3 bottom-3 border-base-300 bg-base-100 text-base-content shadow-sm sm:right-5 sm:bottom-5"
          >
            <Images className="size-4" aria-hidden="true" />
            {images.length === 1
              ? t("View photo")
              : t("View all {count} photos", { count: images.length })}
          </button>
        </div>
        {images.length > 1 && (
          <div
            className={`hidden gap-2 md:grid ${images.length > 2 ? "grid-rows-2" : ""}`}
          >
            {images.slice(1, 3).map((src, index) => (
              <button
                key={`${index}-${src}`}
                type="button"
                aria-label={t("View property photo {number}", {
                  number: index + 2,
                })}
                className="group relative min-h-0 overflow-hidden bg-base-200"
                onClick={() => openGallery(index + 1)}
              >
                <img
                  src={src}
                  alt={imageDescriptions?.[index + 1] ?? ""}
                  className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <PropertyPhotoDialog
        images={images}
        imageDescriptions={imageDescriptions}
        title={title}
        activeIndex={activeIndex}
        onStep={stepGallery}
        dialogRef={gallery}
      />
    </>
  );
}
