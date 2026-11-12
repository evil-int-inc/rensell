import { useI18n } from "@/i18n";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, LocateFixed, MapPin, Minus, Plus } from "lucide-react";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  type PropertyCoordinates,
  type PropertyListing,
  formatLocation,
  formatPrice,
} from "./catalog";

type PropertyMapProps = {
  listings: readonly PropertyListing[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showSummary?: boolean;
  className?: string;
};

type Point = { x: number; y: number };
type Camera = { center: Point; zoom: number };

const tileSize = 256;
const minZoom = 2;
const maxZoom = 18;
const maxLatitude = 85.05112878;
const tileTemplate =
  import.meta.env.VITE_MAP_TILE_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function project({ latitude, longitude }: PropertyCoordinates): Point {
  const radians = (Math.PI / 180) * latitude;
  return {
    x: (longitude + 180) / 360,
    y: (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2,
  };
}

function fitCamera(points: Point[], width: number, height: number): Camera {
  if (points.length === 1) return { center: points[0], zoom: 15 };

  const x = points.map((point) => point.x);
  const y = points.map((point) => point.y);
  const left = Math.min(...x);
  const right = Math.max(...x);
  const top = Math.min(...y);
  const bottom = Math.max(...y);
  const scale = Math.min(
    Math.max(1, width - 112) / Math.max(0.000001, right - left),
    Math.max(1, height - 96) / Math.max(0.000001, bottom - top),
  );

  return {
    center: { x: (left + right) / 2, y: (top + bottom) / 2 },
    zoom: Math.max(
      minZoom,
      Math.min(15, Math.floor(Math.log2(scale / tileSize))),
    ),
  };
}

function visibleTiles(camera: Camera, width: number, height: number) {
  const gridSize = 2 ** camera.zoom;
  const originX = camera.center.x * gridSize * tileSize - width / 2;
  const originY = camera.center.y * gridSize * tileSize - height / 2;
  const tiles: { key: string; url: string; left: number; top: number }[] = [];

  for (
    let y = Math.max(0, Math.floor(originY / tileSize));
    y < Math.min(gridSize, Math.ceil((originY + height) / tileSize));
    y += 1
  ) {
    for (
      let x = Math.floor(originX / tileSize);
      x < Math.ceil((originX + width) / tileSize);
      x += 1
    ) {
      tiles.push({
        key: `${camera.zoom}/${x}/${y}`,
        url: tileTemplate
          .replace("{z}", String(camera.zoom))
          .replace("{x}", String(((x % gridSize) + gridSize) % gridSize))
          .replace("{y}", String(y)),
        left: x * tileSize - originX,
        top: y * tileSize - originY,
      });
    }
  }

  return tiles;
}

function panCamera(camera: Camera, x: number, y: number): Camera {
  const scale = tileSize * 2 ** camera.zoom;
  const nextX = camera.center.x + x / scale;
  return {
    ...camera,
    center: {
      x: ((nextX % 1) + 1) % 1,
      y: Math.max(0, Math.min(1, camera.center.y + y / scale)),
    },
  };
}

export function PropertyMap({
  listings,
  selectedId,
  onSelect,
  showSummary = true,
  className = "",
}: PropertyMapProps) {
  const { t } = useI18n();
  const keyboardHint = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; camera: Camera } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<{ key: string; camera: Camera }>();
  const [localSelection, setLocalSelection] = useState<string>();
  const [failedTiles, setFailedTiles] = useState<Set<string>>(() => new Set());
  const locations = listings.flatMap((listing) => {
    const coordinates = listing.coordinates;
    if (
      !coordinates ||
      !Number.isFinite(coordinates.latitude) ||
      !Number.isFinite(coordinates.longitude) ||
      Math.abs(coordinates.latitude) > maxLatitude ||
      Math.abs(coordinates.longitude) > 180
    ) {
      return [];
    }
    return [{ listing, point: project(coordinates) }];
  });
  const hasLocations = locations.length > 0;

  useEffect(() => {
    if (!hasLocations) return;
    const element = viewport.current;
    if (!element) return;
    const measure = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasLocations]);

  if (!hasLocations) {
    return (
      <div
        className={`grid min-h-72 place-items-center rounded-box border border-base-300 bg-base-200 p-6 text-center ${className}`}
      >
        <div>
          <MapPin
            aria-hidden="true"
            className="mx-auto mb-3 size-7 text-primary"
          />
          <p className="font-semibold">
            {t("No properties to show on the map")}
          </p>
          <p className="mt-1 text-sm text-base-content/65">
            {t("Map pins appear when a listing includes coordinates.")}
          </p>
        </div>
      </div>
    );
  }

  const fitKey = locations
    .map(({ listing, point }) => `${listing.id}:${point.x}:${point.y}`)
    .sort()
    .join("|");
  const { width, height } = size;
  const camera =
    view?.key === fitKey
      ? view.camera
      : fitCamera(
          locations.map(({ point }) => point),
          width,
          height,
        );
  const tiles = width && height ? visibleTiles(camera, width, height) : [];
  const activeId = selectedId === undefined ? localSelection : selectedId;
  const selected = locations.find(
    ({ listing }) => listing.id === activeId,
  )?.listing;
  const tileScale = tileSize * 2 ** camera.zoom;

  function updateCamera(next: Camera) {
    setView({ key: fitKey, camera: next });
  }

  function zoomBy(amount: number) {
    updateCamera({
      ...camera,
      zoom: Math.max(minZoom, Math.min(maxZoom, camera.zoom + amount)),
    });
  }

  function handleMapKey(event: KeyboardEvent<HTMLButtonElement>) {
    const direction = {
      ArrowLeft: [-64, 0],
      ArrowRight: [64, 0],
      ArrowUp: [0, -64],
      ArrowDown: [0, 64],
    }[event.key];
    if (direction) {
      event.preventDefault();
      updateCamera(panCamera(camera, direction[0], direction[1]));
    }
    if (event.key === "+" || event.key === "=" || event.key === "-") {
      event.preventDefault();
      zoomBy(event.key === "-" ? -1 : 1);
    }
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, camera };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || !drag.current) return;
    updateCamera(
      panCamera(
        drag.current.camera,
        drag.current.x - event.clientX,
        drag.current.y - event.clientY,
      ),
    );
  }

  return (
    <section
      aria-label={t("Property map")}
      className={`flex min-h-72 flex-col overflow-hidden rounded-box border border-base-300 bg-base-100 ${className}`}
    >
      <div
        ref={viewport}
        className="relative isolate min-h-72 flex-1 overflow-hidden bg-base-200"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-85 grayscale [[data-theme=market-dark]_&]:opacity-60 [[data-theme=market-dark]_&]:invert"
        >
          {tiles
            .filter(({ url }) => !failedTiles.has(url))
            .map(({ key, url, left, top }) => (
              <img
                key={key}
                src={url}
                alt=""
                width={tileSize}
                height={tileSize}
                referrerPolicy="strict-origin-when-cross-origin"
                draggable={false}
                className="absolute max-w-none"
                style={{ left: Math.round(left), top: Math.round(top) }}
                onError={() =>
                  setFailedTiles((failed) => new Set(failed).add(url))
                }
              />
            ))}
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
        />
        {tiles.length > 0 && tiles.every(({ url }) => failedTiles.has(url)) && (
          <output className="pointer-events-none absolute top-3 left-3 rounded-field border border-base-300 bg-base-100/95 px-2 py-1 text-xs text-base-content/70">
            {t("Basemap unavailable")}
          </output>
        )}
        {locations.map(({ listing, point }) => {
          const left =
            width / 2 +
            (point.x -
              camera.center.x -
              Math.round(point.x - camera.center.x)) *
              tileScale;
          const top = height / 2 + (point.y - camera.center.y) * tileScale;
          if (left < 0 || left > width || top < 0 || top > height) return null;
          const active = listing.id === activeId;

          return (
            <button
              key={listing.id}
              type="button"
              aria-label={`${listing.title}, ${formatPrice(listing.price)}`}
              aria-pressed={active}
              className={`btn btn-xs absolute h-7 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full px-2.5 shadow-md ${active ? "btn-primary z-10" : "bg-base-100 text-base-content hover:z-10 hover:border-primary"}`}
              style={{ left, top }}
              onClick={() => {
                setLocalSelection(listing.id);
                onSelect?.(listing.id);
              }}
            >
              {formatPrice(listing.price)}
            </button>
          );
        })}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
          <div className="join join-vertical shadow-sm">
            <button
              type="button"
              aria-label={t("Zoom in")}
              disabled={camera.zoom >= maxZoom}
              onClick={() => zoomBy(1)}
              className="btn btn-sm join-item size-9 bg-base-100 p-0"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t("Zoom out")}
              disabled={camera.zoom <= minZoom}
              onClick={() => zoomBy(-1)}
              className="btn btn-sm join-item size-9 bg-base-100 p-0"
            >
              <Minus aria-hidden="true" className="size-4" />
            </button>
          </div>
          <button
            type="button"
            aria-label={t("Fit property locations")}
            aria-describedby={keyboardHint}
            onClick={() => setView(undefined)}
            onKeyDown={handleMapKey}
            className="btn btn-sm size-9 bg-base-100 p-0 shadow-sm"
          >
            <LocateFixed aria-hidden="true" className="size-4" />
          </button>
          <span id={keyboardHint} className="sr-only">
            {t("Use arrow keys to pan and plus or minus to zoom.")}
          </span>
        </div>
        <div className="absolute right-0 bottom-0 z-20 flex flex-wrap justify-end gap-x-2 rounded-tl-field bg-base-100/95 px-2 py-1 text-[10px] text-base-content/80">
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            {t("© OpenStreetMap contributors")}
          </a>
          <a
            href="https://www.openstreetmap.org/fixthemap"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            {t("Report a map issue")}
          </a>
        </div>
      </div>
      {showSummary && selected && (
        <Link
          to="/properties/$listingId"
          params={{ listingId: selected.id }}
          className="flex items-center justify-between gap-4 border-t border-base-300 p-4 hover:bg-base-200 focus-visible:-outline-offset-4"
        >
          <div>
            <p className="font-semibold">{selected.title}</p>
            <p className="mt-0.5 text-sm text-base-content/65">
              {formatLocation(selected)} · {formatPrice(selected.price)}
            </p>
          </div>
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 shrink-0 text-primary"
          />
        </Link>
      )}
    </section>
  );
}
