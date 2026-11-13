import { ListingEditor } from "@/marketplace/ListingEditor";
import * as listingEditorData from "@/marketplace/listing-editor-data";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

const importMyHome = vi.fn();

const url = "https://www.myhome.ge/en/real-estate/apartment-for-sale-26625884/";
const image = "data:image/jpeg;base64,cGhvdG8=";
const importedAd = {
  source: { url, id: "26625884" },
  images: [image],
  warnings: ["Check the asking price before saving."],
  fields: {
    title: "Imported apartment",
    description: "Two bedrooms and a balcony.",
    price: 140000,
    city: "Tbilisi",
    address: "Nutsubidze Street",
    neighborhood: "Nutsubidze Plateau",
    areaM2: 80,
    seller: { name: "Source Seller", role: "Real estate agent" },
  },
};

function setSourceUrl() {
  fireEvent.change(screen.getByLabelText("MyHome ad URL"), {
    target: { value: url },
  });
}

beforeEach(() => {
  importMyHome.mockReset();
});

it("keeps all imported photos in order and allows adding a manual photo", async () => {
  const user = userEvent.setup();
  const save = vi.fn().mockResolvedValue(undefined);
  const importedPhotos = Array.from(
    { length: 8 },
    (_, index) => `data:image/jpeg;base64,${btoa(`photo ${index}`)}`,
  );
  importMyHome.mockResolvedValue({ ...importedAd, images: importedPhotos });
  const preparePhoto = vi.spyOn(listingEditorData, "prepareListingPhoto");
  preparePhoto.mockResolvedValue(image);
  try {
    render(
      <ListingEditor
        importMyHome={importMyHome}
        onSave={save}
        onCancel={vi.fn()}
      />,
    );
    setSourceUrl();
    await user.click(screen.getByRole("button", { name: "Import ad" }));
    expect(
      await screen.findByRole("img", { name: "Listing view 8" }),
    ).toBeVisible();

    const upload = new File(["new photo"], "new.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText(/Add property photos/), upload);
    expect(
      await screen.findByRole("img", { name: "Listing view 9" }),
    ).toHaveAttribute("src", image);

    await user.click(screen.getByRole("button", { name: "Save listing" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          images: [...importedPhotos, image],
        }),
      ),
    );
  } finally {
    preparePhoto.mockRestore();
  }
});

it("fills a reviewable draft with source photos and preserves manually entered fields", async () => {
  const user = userEvent.setup();
  const save = vi.fn().mockResolvedValue(undefined);
  importMyHome.mockResolvedValue(importedAd);
  render(
    <ListingEditor
      importMyHome={importMyHome}
      onSave={save}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText(/Listing title/), {
    target: { value: "My own title" },
  });
  setSourceUrl();
  await user.click(screen.getByRole("button", { name: "Import ad" }));

  expect(
    await screen.findByText("Ad imported. Review the details before saving."),
  ).toBeVisible();
  expect(importMyHome).toHaveBeenCalledWith(
    url,
    expect.any(AbortSignal),
    undefined,
  );
  expect(screen.getByLabelText(/Listing title/)).toHaveValue("My own title");
  expect(screen.getByLabelText(/Asking price/)).toHaveValue(140000);
  expect(screen.getByLabelText("Availability")).toHaveValue("draft");
  expect(screen.getByLabelText("Seller type")).toHaveValue("Real estate agent");
  expect(screen.getByRole("img", { name: "Listing view 1" })).toHaveAttribute(
    "src",
    image,
  );
  expect(
    screen.getByRole("link", { name: "Original MyHome ad" }),
  ).toHaveAttribute("href", url);
  expect(
    screen.getByText("Check the asking price before saving."),
  ).toBeVisible();
  expect(save).not.toHaveBeenCalled();

  await user.click(
    screen.getByRole("button", { name: "Review listing details" }),
  );
  expect(screen.getByLabelText(/Listing title/)).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Save listing" }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "My own title",
        price: 140000,
        status: "draft",
        images: [image],
        source: { provider: "myhome", id: "26625884", url },
      }),
    ),
  );
});

it("offers a saved HTML file when the original link cannot be loaded", async () => {
  const user = userEvent.setup();
  const save = vi.fn();
  const savedPage = new File(
    ["<html>Property listing</html>"],
    "listing.html",
    { type: "text/html" },
  );
  importMyHome
    .mockRejectedValueOnce(new Error("MyHome blocked the link request."))
    .mockResolvedValueOnce(importedAd);
  render(
    <ListingEditor
      importMyHome={importMyHome}
      onSave={save}
      onCancel={vi.fn()}
    />,
  );

  setSourceUrl();
  await user.click(screen.getByRole("button", { name: "Import ad" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "MyHome blocked the link request.",
  );
  await user.upload(screen.getByLabelText("Saved MyHome page"), savedPage);
  await user.click(screen.getByRole("button", { name: "Import saved page" }));

  expect(importMyHome).toHaveBeenLastCalledWith(
    url,
    expect.any(AbortSignal),
    savedPage,
  );
  expect(
    await screen.findByText("Ad imported. Review the details before saving."),
  ).toBeVisible();
  expect(screen.getByLabelText(/Listing title/)).toHaveValue(
    "Imported apartment",
  );
  expect(save).not.toHaveBeenCalled();
});

it("allows retry after a failure and ignores the response to a canceled import", async () => {
  const user = userEvent.setup();
  const save = vi.fn();
  let resolveImport: (ad: typeof importedAd) => void = () => {};
  importMyHome.mockRejectedValueOnce(
    new Error("The source ad was unavailable."),
  );
  importMyHome.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveImport = resolve;
      }),
  );
  render(
    <ListingEditor
      importMyHome={importMyHome}
      onSave={save}
      onCancel={vi.fn()}
    />,
  );
  setSourceUrl();

  await user.click(screen.getByRole("button", { name: "Import ad" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The source ad was unavailable.",
  );
  expect(screen.getByLabelText(/Listing title/)).toHaveValue("");

  await user.click(screen.getByRole("button", { name: "Import ad" }));
  expect(screen.getByRole("button", { name: "Save listing" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Cancel import" }));
  expect(importMyHome.mock.calls[1][1].aborted).toBe(true);
  await act(async () => resolveImport(importedAd));
  expect(screen.getByText("Import canceled.")).toBeVisible();
  expect(screen.getByLabelText(/Listing title/)).toHaveValue("");
  expect(screen.getByRole("button", { name: "Save listing" })).toBeEnabled();
  expect(save).not.toHaveBeenCalled();
});
