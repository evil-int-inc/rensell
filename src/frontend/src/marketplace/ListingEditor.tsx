import { Camera, CircleAlert, MapPin, X } from "lucide-react";
import {
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { type PropertyListing, propertyTypes } from "./catalog";
import {
  listingStatusLabels,
  maxPhotos,
  prepareListingPhoto,
  readListingForm,
} from "./listing-editor-data";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

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
}: { title: string; description: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-box border border-base-300 bg-base-100 p-5 sm:grid-cols-2 sm:p-7">
      <legend className="px-2 font-editorial text-2xl tracking-tight">
        {title}
      </legend>
      <p className="text-sm text-base-content/70 sm:col-span-2">
        {description}
      </p>
      {children}
    </fieldset>
  );
}

export function ListingEditor({
  listing,
  onSave,
  onCancel,
}: {
  listing?: PropertyListing;
  onSave: (listing: PropertyListing) => Promise<void>;
  onCancel: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [listingId] = useState(() => listing?.id ?? crypto.randomUUID());
  const [images, setImages] = useState(listing?.images ?? []);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [saveError, setSaveError] = useState("");
  const title = listing ? "Edit property" : "Create a property listing";

  useEffect(() => {
    heading.current?.focus();
  }, []);

  async function addPhotos(files: File[]) {
    setPhotoError("");
    if (!files.length) return;
    if (files.length + images.length > maxPhotos) {
      setPhotoError(`You can add up to ${maxPhotos} photos per listing.`);
      return;
    }
    setIsPreparing(true);
    try {
      const photos: string[] = [];
      for (const file of files) photos.push(await prepareListingPhoto(file));
      setImages((current) => [...current, ...photos]);
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
    if (isPreparing || isSaving) return;
    setSaveError("");
    try {
      const nextListing = readListingForm(
        new FormData(event.currentTarget),
        images,
        listingId,
        listing,
      );
      setIsSaving(true);
      await onSave(nextListing);
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

      <form onSubmit={handleSubmit} aria-busy={isSaving}>
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
            {images.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-3 lg:grid-cols-5">
                {images.map((source, index) => (
                  <li
                    className="relative aspect-4/3 overflow-hidden rounded-box bg-base-200"
                    key={`${index}-${source}`}
                  >
                    <img
                      src={source}
                      alt={`Listing upload ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      className="btn btn-square btn-sm absolute top-2 right-2 border-base-300 bg-base-100 text-base-content"
                      aria-label={`Remove photo ${index + 1}`}
                      disabled={isPreparing}
                      onClick={() =>
                        setImages(
                          images.filter(
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
                  </li>
                ))}
              </ul>
            )}
            {images.length < maxPhotos && (
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
                  disabled={isPreparing}
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
                defaultValue={listing?.seller.role ?? "Owner"}
              >
                <option>Owner</option>
                <option>Real estate agent</option>
                <option>Property developer</option>
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
              disabled={isPreparing}
            >
              {isSaving ? "Saving…" : "Save listing"}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
