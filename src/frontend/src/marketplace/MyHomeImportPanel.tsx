import { type LocalizedMessage, translateError, useI18n } from "@/i18n";
import { ArrowUpRight, CircleAlert, Link2 } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

type ImportReview = {
  sourceUrl: string;
  warnings: (string | LocalizedMessage)[];
};

export function MyHomeImportPanel({
  disabled,
  importing,
  onImportingChange,
  onImport,
  onReview,
}: {
  disabled: boolean;
  importing: boolean;
  onImportingChange: (importing: boolean) => void;
  onImport: (
    url: string,
    signal: AbortSignal,
    savedPage?: File,
  ) => Promise<ImportReview>;
  onReview: () => void;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [showSavedPage, setShowSavedPage] = useState(false);
  const [savedPage, setSavedPage] = useState<File>();
  const [review, setReview] = useState<ImportReview>();
  const [error, setError] = useState("");
  const [canceled, setCanceled] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || activeRequest.current) return;

    const controller = new AbortController();
    activeRequest.current = controller;
    onImportingChange(true);
    setError("");
    setCanceled(false);

    try {
      const imported = await onImport(url.trim(), controller.signal, savedPage);
      if (!controller.signal.aborted) setReview(imported);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof Error
            ? cause.message
            : "This ad couldn’t be imported.",
        );
        setShowSavedPage(true);
      }
    } finally {
      if (activeRequest.current === controller && !controller.signal.aborted) {
        activeRequest.current = null;
        onImportingChange(false);
      }
    }
  }

  function cancelImport() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    onImportingChange(false);
    setCanceled(true);
  }

  const status = importing
    ? "Importing ad…"
    : canceled
      ? "Import canceled."
      : review && !error
        ? "Ad imported. Review the details before saving."
        : "";

  return (
    <section
      aria-labelledby="myhome-import-heading"
      className="mb-8 rounded-box border border-base-300 bg-base-200 p-4 sm:p-6"
    >
      <h3
        id="myhome-import-heading"
        className="flex items-center gap-2.5 font-editorial text-2xl tracking-tight"
      >
        <Link2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
        {t("Import a MyHome ad")}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-base-content/75">
        {t(
          "Paste a MyHome.ge property link to fill in the listing. You can review and edit the details before saving.",
        )}
      </p>

      <form onSubmit={handleImport} className="mt-4 grid gap-2.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
          <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-semibold">
            {t("MyHome ad URL")}
            <input
              className="input w-full border-base-300 bg-base-100 font-normal"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://www.myhome.ge/…"
              required
              value={url}
              disabled={disabled || importing}
              onChange={(event) => setUrl(event.currentTarget.value)}
            />
          </label>
          <button
            type={importing ? "button" : "submit"}
            className={`btn ${importing ? "btn-outline" : "btn-primary"}`}
            onClick={importing ? cancelImport : undefined}
            disabled={disabled}
          >
            {t(
              importing
                ? "Cancel import"
                : savedPage
                  ? "Import saved page"
                  : "Import ad",
            )}
          </button>
        </div>
        <button
          type="button"
          className="link w-fit text-start text-sm font-semibold text-primary"
          aria-controls="myhome-saved-page"
          aria-expanded={showSavedPage}
          disabled={disabled || importing}
          onClick={() => {
            setShowSavedPage(!showSavedPage);
            if (showSavedPage) setSavedPage(undefined);
          }}
        >
          {t(
            showSavedPage
              ? "Hide saved-page option"
              : "Use a saved MyHome page",
          )}
        </button>
        <div id="myhome-saved-page" hidden={!showSavedPage}>
          {showSavedPage && (
            <div className="grid gap-1.5">
              <label
                htmlFor="myhome-saved-file"
                className="text-sm font-semibold"
              >
                {t("Saved MyHome page")}
              </label>
              <input
                id="myhome-saved-file"
                aria-describedby="myhome-saved-help"
                type="file"
                accept=".html,.htm,text/html"
                className="file-input file-input-sm w-full border-base-300 bg-base-100 font-normal"
                disabled={disabled || importing}
                onChange={(event) =>
                  setSavedPage(event.currentTarget.files?.[0])
                }
              />
              <p
                id="myhome-saved-help"
                className="text-xs text-base-content/65"
              >
                {t(
                  "Save the original ad as an HTML file in your browser. Enter the matching MyHome URL above and choose the file here.",
                )}
              </p>
            </div>
          )}
        </div>
      </form>

      <output
        className={
          status
            ? "mt-3 flex items-center gap-2 text-sm text-base-content/75"
            : "sr-only"
        }
      >
        {importing && (
          <span
            className="loading loading-spinner loading-sm text-primary"
            aria-hidden="true"
          />
        )}
        {t(status)}
      </output>
      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 text-sm text-error"
        >
          <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />{" "}
          {translateError(error)}
        </p>
      )}
      {review && (
        <div className="mt-4 border-t border-base-300 pt-4">
          {review.warnings.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-base-content/75">
              {review.warnings.map((warning) => (
                <li
                  key={typeof warning === "string" ? warning : warning.message}
                >
                  {t(warning)}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onReview}
              disabled={disabled}
            >
              {t("Review listing details")}
            </button>
            <a
              href={review.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="link inline-flex items-center gap-1 text-sm font-semibold text-primary"
            >
              {t("Original MyHome ad")}{" "}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
