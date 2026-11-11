import { Camera, CircleAlert, MapPin, X } from "lucide-react";
import {
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { MyHomeImportPanel } from "./MyHomeImportPanel";
import { type PropertyListing, propertyTypes } from "./catalog";
import {
  type ListingPhoto,
  getListingField,
  importedFormValues,
  listingStatusLabels,
  maxPhotos,
  prepareListingPhoto,
  readListingForm,
  updateImportedField,
} from "./listing-editor-data";
import type { MyHomeImport } from "./myhome-import";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string };
type EditorPhoto = ListingPhoto & { imported?: boolean };
type ListingSource = NonNullable<PropertyListing["source"]>;
type EditorSourceFact = { key: number; label: string; value: string };
type LoadedAd = Omit<MyHomeImport, "photoUrls"> & { images: string[] };
type ImportMyHomeAd = (
  url: string,
  signal: AbortSignal,
  savedPage?: File,
) => Promise<LoadedAd>;

const sellerRoles = ["Owner", "Real estate agent", "Property developer"];

function Field({ label, required, ...props }: FieldProps) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-sm font-semibold">
        {label}
        {required && (
          <span className="text-primary" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
      <input
        className="input w-full border-base-300 bg-base-100"
        required={required}
        {...props}
      />
    </label>
  );
}

function FormSection({
  title,
  description,
  children,
}: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-box border border-base-300 bg-base-100 p-5 sm:grid-cols-2 sm:p-7">
      <legend className="px-2 font-editorial text-2xl tracking-tight">
        {title}
      </legend>
      {description && (
        <p className="text-sm text-base-content/70 sm:col-span-2">
          {description}
        </p>
      )}
      {children}
    </fieldset>
  );
}

function editableSource(source?: ListingSource) {
  return (
    source && {
      ...source,
      facts: source.facts?.map((fact, key) => ({ ...fact, key })) ?? [],
    }
  );
}

export function ListingEditor({
  listing,
  importMyHome,
  onSave,
  onCancel,
}: {
  listing?: PropertyListing;
  importMyHome: ImportMyHomeAd;
  onSave: (listing: PropertyListing) => Promise<void>;
  onCancel: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const editedFields = useRef(new Set<string>());
  const previousImportFields = useRef<string[]>([]);
  const [listingId] = useState(() => listing?.id ?? crypto.randomUUID());
  const [source, setSource] = useState(() => editableSource(listing?.source));
  const [photos, setPhotos] = useState<EditorPhoto[]>(
    () =>
      listing?.images.map((source, index) => ({
        source,
        description: listing.imageDescriptions?.[index],
      })) ?? [],
  );
  const [isImporting, setIsImporting] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [saveError, setSaveError] = useState("");
  const title = listing ? "Edit property" : "Create a property listing";
  const sellerRole = listing?.seller.role || "Owner";

  useEffect(() => {
    heading.current?.focus();
  }, []);

  async function importAd(url: string, signal: AbortSignal, savedPage?: File) {
    const imported = await importMyHome(url, signal, savedPage);
    signal.throwIfAborted();
    const editor = form.current;
    if (!editor) throw new Error("The listing editor is closed.");

    const values = importedFormValues(imported.fields);
    const names = Object.keys(values);
    if (!names.length && !imported.images.length) {
      throw new Error("No listing details could be read from this MyHome ad.");
    }
    const fieldsToApply = new Set([...previousImportFields.current, ...names]);
    const warnings = [...imported.warnings];
    for (const name of fieldsToApply) {
      if (editedFields.current.has(name)) continue;
      const field = getListingField(editor, name);
      if (field) updateImportedField(field, values[name]);
    }
    previousImportFields.current = names;
    if (names.some((name) => editedFields.current.has(name))) {
      warnings.push("Your manual edits were kept.");
    }

    const uploaded = photos.filter((photo) => !photo.imported);
    const uploadedSources = new Set(uploaded.map(({ source }) => source));
    const found = [...new Set(imported.images)].filter(
      (source) => !uploadedSources.has(source),
    );
    const added = found.slice(0, maxPhotos - uploaded.length);
    if (added.length < found.length) {
      warnings.push(
        `Some source photos were skipped because the listing can hold up to ${maxPhotos} photos.`,
      );
    }
    setPhotos([
      ...uploaded,
      ...added.map((source) => ({ source, imported: true })),
    ]);
    setSource(editableSource({ provider: "myhome", ...imported.source }));
    setSaveError("");
    return { sourceUrl: imported.source.url, warnings };
  }

  function updateSourceFacts(
    update: (facts: EditorSourceFact[]) => EditorSourceFact[],
  ) {
    setSource((current) =>
      current ? { ...current, facts: update(current.facts) } : current,
    );
  }

  async function addPhotos(files: File[]) {
    setPhotoError("");
    if (!files.length || isImporting) return;
    if (files.length + photos.length > maxPhotos) {
      setPhotoError(`You can add up to ${maxPhotos} photos per listing.`);
      return;
    }
    setIsPreparing(true);
    try {
      const uploaded: EditorPhoto[] = [];
      for (const file of files)
        uploaded.push({ source: await prepareListingPhoto(file) });
      setPhotos((current) => [...current, ...uploaded]);
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : "These photos couldn’t be prepared.",
      );
    } finally {
      setIsPreparing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isImporting || isPreparing || isSaving) return;
    setSaveError("");
    try {
      const nextListing = readListingForm(
        new FormData(event.currentTarget),
        photos,
        listingId,
        listing,
      );
      const facts = source?.facts
        .map(({ label, value }) => ({
          label: label.trim(),
          value: value.trim(),
        }))
        .filter(({ label, value }) => label && value);
      setIsSaving(true);
      await onSave({
        ...nextListing,
        source: source && {
          provider: source.provider,
          id: source.id,
          url: source.url,
          ...(facts?.length ? { facts } : {}),
        },
      });
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "This listing couldn’t be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="listing-editor-heading"
      className="mt-10 max-w-4xl border-t border-base-300 pt-8"
    >
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            id="listing-editor-heading"
            ref={heading}
            tabIndex={-1}
            className="font-editorial text-3xl tracking-tight focus:outline-none sm:text-4xl"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm text-base-content/70">
            Fields marked with an asterisk are required.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X className="size-4" aria-hidden="true" /> Close editor
        </button>
      </div>

      {!listing && (
        <MyHomeImportPanel
          disabled={isPreparing || isSaving}
          importing={isImporting}
          onImportingChange={setIsImporting}
          onImport={importAd}
          onReview={() => {
            if (form.current) getListingField(form.current, "title")?.focus();
          }}
        />
      )}

      <form
        ref={form}
        onSubmit={handleSubmit}
        onChange={(event) => {
          const { target } = event;
          if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLSelectElement ||
            target instanceof HTMLTextAreaElement
          )
            editedFields.current.add(target.name);
        }}
        aria-busy={isSaving}
      >
        <fieldset disabled={isSaving} className="grid min-w-0 gap-6">
          <FormSection
            title="Property essentials"
            description="Give buyers a clear picture of what you’re offering."
          >
            <div className="sm:col-span-2">
              <Field
                label="Listing title"
                name="title"
                defaultValue={listing?.title}
                placeholder="A light-filled apartment in Vera"
                required
                maxLength={100}
              />
            </div>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Property type{" "}
              <select
                className="select w-full border-base-300"
                name="type"
                defaultValue={listing?.type ?? "Apartment"}
              >
                {propertyTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <Field
              label="Asking price (USD)"
              name="price"
              type="number"
              min="1"
              max="1000000000"
              step="1"
              defaultValue={listing?.price}
              required
            />
            <label className="flex flex-col gap-2 text-sm font-semibold sm:col-span-2">
              <span>
                Description
                <span className="text-primary" aria-hidden="true">
                  {" "}
                  *
                </span>
              </span>
              <textarea
                className="textarea min-h-28 w-full border-base-300 text-base font-normal"
                name="description"
                defaultValue={listing?.description}
                maxLength={4000}
                required
                placeholder="Describe the layout, condition, and what makes this property special."
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Availability{" "}
              <select
                className="select w-full border-base-300"
                name="status"
                defaultValue={listing?.status ?? "draft"}
              >
                {Object.entries(listingStatusLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2.5 self-end rounded-field border border-base-300 px-3 py-2.5 text-sm font-semibold">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={listing?.featured}
                className="checkbox checkbox-primary checkbox-sm"
              />
              Featured listing
            </label>
          </FormSection>

          <FormSection
            title="Location"
            description="Add the street address. Use coordinates to place a pin on the map."
          >
            <Field
              label="City"
              name="city"
              defaultValue={listing?.city ?? "Tbilisi"}
              required
              maxLength={80}
            />
            <Field
              label="Neighborhood"
              name="neighborhood"
              defaultValue={listing?.neighborhood}
              required
              maxLength={80}
            />
            <div className="sm:col-span-2">
              <Field
                label="Street address"
                name="address"
                defaultValue={listing?.address}
                required
                maxLength={150}
              />
            </div>
            <Field
              label="Latitude"
              name="latitude"
              type="number"
              min="-85"
              max="85"
              step="any"
              defaultValue={listing?.coordinates?.latitude}
              placeholder="41.7151"
            />
            <Field
              label="Longitude"
              name="longitude"
              type="number"
              min="-180"
              max="180"
              step="any"
              defaultValue={listing?.coordinates?.longitude}
              placeholder="44.8271"
            />
            <p className="flex items-start gap-2 text-xs text-base-content/65 sm:col-span-2">
              <MapPin
                className="mt-px size-3.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              Coordinates are optional. The address will still link to a map
              search.
            </p>
          </FormSection>

          <FormSection
            title="Photos"
            description={`Add up to ${maxPhotos} photos. The first photo is used as the cover image.`}
          >
            {photos.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-3 lg:grid-cols-5">
                {photos.map(({ source, description }, index) => (
                  <li
                    className="grid min-w-0 content-start gap-2"
                    key={`${index}-${source}`}
                  >
                    <div className="relative aspect-4/3 overflow-hidden rounded-box bg-base-200">
                      <img
                        src={source}
                        alt={`Listing view ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        className="btn btn-square btn-sm absolute top-2 right-2 border-base-300 bg-base-100 text-base-content"
                        aria-label={`Remove photo ${index + 1}`}
                        disabled={isPreparing || isImporting}
                        onClick={() =>
                          setPhotos((current) =>
                            current.filter(
                              (_, photoIndex) => photoIndex !== index,
                            ),
                          )
                        }
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                      {index === 0 && (
                        <span className="badge badge-sm absolute bottom-2 left-2 bg-base-100 text-base-content">
                          Cover
                        </span>
                      )}
                    </div>
                    <Field
                      label={`Photo ${index + 1} description`}
                      placeholder="Optional"
                      maxLength={180}
                      value={description ?? ""}
                      disabled={isImporting}
                      onChange={(event) => {
                        const description = event.currentTarget.value;
                        setPhotos((current) =>
                          current.map((photo, photoIndex) =>
                            photoIndex === index
                              ? { ...photo, description }
                              : photo,
                          ),
                        );
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
            {photos.length < maxPhotos && (
              <label className="flex flex-col items-start gap-2 rounded-box border border-dashed border-base-300 bg-base-200 p-4 text-sm font-semibold sm:col-span-2 sm:p-5">
                <span className="flex items-center gap-2">
                  <Camera className="size-4 text-primary" aria-hidden="true" />{" "}
                  Add property photos
                </span>
                <input
                  className="file-input file-input-sm w-full max-w-sm border-base-300 bg-base-100"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isPreparing || isImporting}
                  onChange={(event) => {
                    const files = [...(event.currentTarget.files ?? [])];
                    event.currentTarget.value = "";
                    void addPhotos(files);
                  }}
                />
                <span className="text-xs font-normal text-base-content/65">
                  JPG, PNG, or WebP. Up to 20 MB per original image.
                </span>
              </label>
            )}
            {isPreparing && (
              <output className="text-sm text-base-content/70 sm:col-span-2">
                Preparing your photos…
              </output>
            )}
            {photoError && (
              <p role="alert" className="text-sm text-error sm:col-span-2">
                {photoError}
              </p>
            )}
          </FormSection>

          {source && (listing || source.facts.length > 0) && (
            <FormSection
              title="MyHome source"
              description={
                source.facts.length
                  ? "Edit or remove imported facts shown on this listing."
                  : undefined
              }
            >
              {listing && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link link-primary w-fit text-sm font-semibold sm:col-span-2"
                >
                  Original MyHome ad {source.id}
                </a>
              )}
              {source.facts.length > 0 && (
                <ul className="grid gap-3 sm:col-span-2">
                  {source.facts.map((fact, index) => (
                    <li
                      key={fact.key}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 rounded-field border border-base-300 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
                    >
                      <div className="col-span-2 sm:col-span-1">
                        <Field
                          label={`Imported fact ${index + 1} label`}
                          value={fact.label}
                          disabled={isImporting}
                          maxLength={100}
                          onChange={(event) => {
                            const label = event.currentTarget.value;
                            updateSourceFacts((facts) =>
                              facts.map((item) =>
                                item.key === fact.key
                                  ? { ...item, label }
                                  : item,
                              ),
                            );
                          }}
                        />
                      </div>
                      <Field
                        label={`Imported fact ${index + 1} value`}
                        value={fact.value}
                        disabled={isImporting}
                        maxLength={500}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          updateSourceFacts((facts) =>
                            facts.map((item) =>
                              item.key === fact.key ? { ...item, value } : item,
                            ),
                          );
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-square btn-ghost"
                        aria-label={`Remove imported fact ${index + 1}`}
                        disabled={isImporting}
                        onClick={() =>
                          updateSourceFacts((facts) =>
                            facts.filter((item) => item.key !== fact.key),
                          )
                        }
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </FormSection>
          )}

          <FormSection
            title="Details and amenities"
            description="Add any specifications that will help buyers compare properties."
          >
            <Field
              label="Total area (m²)"
              name="areaM2"
              type="number"
              min="0.01"
              max="10000000"
              step="0.01"
              defaultValue={listing?.areaM2}
              required
            />
            <Field
              label="Living area (m²)"
              name="livingAreaM2"
              type="number"
              min="0.01"
              max="10000000"
              step="0.01"
              defaultValue={listing?.livingAreaM2}
            />
            <Field
              label="Bedrooms"
              name="bedrooms"
              type="number"
              min="0"
              max="200"
              defaultValue={listing?.bedrooms}
            />
            <Field
              label="Bathrooms"
              name="bathrooms"
              type="number"
              min="0"
              max="200"
              defaultValue={listing?.bathrooms}
            />
            <Field
              label="Rooms"
              name="rooms"
              type="number"
              min="0"
              max="1000"
              defaultValue={listing?.rooms}
            />
            <Field
              label="Floor"
              name="floor"
              type="number"
              min="-10"
              max="200"
              defaultValue={listing?.floor}
            />
            <Field
              label="Total floors"
              name="totalFloors"
              type="number"
              min="1"
              max="200"
              defaultValue={listing?.totalFloors}
            />
            <Field
              label="Construction year"
              name="builtYear"
              type="number"
              min="1"
              max="2200"
              defaultValue={listing?.builtYear}
            />
            <Field
              label="Building type"
              name="buildingType"
              defaultValue={listing?.buildingType}
              maxLength={100}
              placeholder="Detached residence"
            />
            <Field
              label="Condition"
              name="condition"
              defaultValue={listing?.condition}
              maxLength={100}
              placeholder="Recently renovated"
            />
            <div className="sm:col-span-2">
              <Field
                label="Amenities (separate with commas)"
                name="amenities"
                defaultValue={listing?.amenities.join(", ")}
                maxLength={500}
                placeholder="Parking, balcony, garden"
              />
            </div>
          </FormSection>

          <FormSection
            title="Seller information"
            description="Email and phone are optional and will be public when the listing is published."
          >
            <Field
              label="Seller or agency name"
              name="sellerName"
              defaultValue={listing?.seller.name}
              required
              maxLength={100}
            />
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Seller type{" "}
              <select
                className="select w-full border-base-300"
                name="sellerRole"
                defaultValue={sellerRole}
              >
                {sellerRoles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
                {!sellerRoles.includes(sellerRole) && (
                  <option>{sellerRole}</option>
                )}
              </select>
            </label>
            <Field
              label="Email address"
              name="sellerEmail"
              type="email"
              defaultValue={listing?.seller.email}
              maxLength={254}
            />
            <Field
              label="Phone number"
              name="sellerPhone"
              type="tel"
              defaultValue={listing?.seller.phone}
              maxLength={30}
            />
          </FormSection>

          {saveError && (
            <div role="alert" className="alert alert-error alert-soft">
              <CircleAlert className="size-5 shrink-0" aria-hidden="true" />{" "}
              {saveError}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-base-300 pt-5">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isPreparing || isImporting}
            >
              {isSaving ? "Saving…" : "Save listing"}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
