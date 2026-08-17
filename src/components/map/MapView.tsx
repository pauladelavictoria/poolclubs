import { Suspense, lazy, type ReactNode } from "react";

/**
 * A map, with pins on it.
 *
 * This half is the public face and nothing else: the types every caller uses,
 * and the frame the map is drawn inside. The implementation is in MapCanvas,
 * loaded lazily, because react-map-gl imports maplibre-gl at module scope —
 * a static import here would put ~250KB gzipped into the route chunk of every
 * page that so much as mentions a map, and /clubs is a public page.
 *
 * The frame lives out here, on both this side of the boundary and the fallback,
 * so it has its final size before anything inside it exists. The server does
 * resolve the lazy import and render MapCanvas — react-map-gl draws its own
 * empty container there and builds the map on mount — so the only thing that
 * arrives late is the canvas, inside a box that is already the right shape.
 */

export type Pin = {
  id: string | number;
  lat: number;
  lon: number;
  /** What the hover card reads, and what a screen reader hears on the marker. */
  label: string;
  /** The second line of the hover card — an address, under the name. */
  sublabel?: string;
  /** Shown beside the two lines on hover. A club logo, including a data: URI. */
  imageUrl?: string | null;
};

/** What the map can see: [west, south, east, north]. */
export type Bbox = [number, number, number, number];

export type MapViewProps = {
  pins: Pin[];
  /** Clicking a pin. Omit and pins are not interactive. */
  onSelectPin?: (pin: Pin) => void;
  /** Makes the pins draggable and reports where one was dropped. */
  onMovePin?: (pin: Pin, lat: number, lon: number) => void;
  /** Called once the map settles, and once when it first loads. Panning and
   *  zooming report only on the way down, never mid-gesture. */
  onViewChange?: (bbox: Bbox) => void;
  /** Map chrome, placed over the top-right corner. */
  overlay?: ReactNode;
  /** How close a single pin opens at. Ignored when there are several. */
  zoom?: number;
  className?: string;
};

const MapCanvas = lazy(() => import("./MapCanvas"));

export default function MapView({
  className = "h-64 w-full",
  ...props
}: MapViewProps) {
  // No `overflow-hidden`: the hover card is drawn inside the map and has to be
  // able to leave it, or it is cut off at the edge. The rounding it used to
  // provide is put back on the canvas in index.css, under `.map-frame`.
  const frame = `map-frame relative rounded-control border border-hairline bg-pocket ${className}`;

  return (
    <Suspense fallback={<div className={frame} />}>
      <MapCanvas {...props} className={frame} />
    </Suspense>
  );
}
