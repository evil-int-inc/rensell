import { useI18n } from "@/i18n";
import { useState } from "react";
import { useMarketplace } from "./MarketplaceContext";

export function PublishListingButton({
  id,
  title,
  small,
  onPublished,
}: {
  id: string;
  title: string;
  small?: boolean;
  onPublished?: () => void;
}) {
  const { t } = useI18n();
  const { publishListing } = useMarketplace();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishFailed, setPublishFailed] = useState(false);

  async function publish() {
    setIsPublishing(true);
    setPublishFailed(false);
    try {
      await publishListing(id);
      onPublished?.();
    } catch {
      setPublishFailed(true);
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className={small ? "btn btn-primary btn-sm" : "btn btn-primary"}
        aria-label={t("Publish {title}", { title })}
        aria-busy={isPublishing}
        disabled={isPublishing}
        onClick={publish}
      >
        {t(isPublishing ? "Publishing…" : "Publish")}
      </button>
      {publishFailed && (
        <p role="alert" className="max-w-44 text-right text-sm text-error">
          {t("Couldn’t publish this listing. Try again.")}
        </p>
      )}
    </div>
  );
}
