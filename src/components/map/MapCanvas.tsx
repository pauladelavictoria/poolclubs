import { useEffect, useRef, useState } from "react";
import MapLibre, { Marker, Popup, type MapRef } from "react-map-gl/maplibre";
import { setWorkerUrl, type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre 6 finds its worker at runtime with
// `new URL("./maplibre-gl-worker.mjs", import.meta.url)`, which resolves next to
// the bundled chunk — where no such file exists. The request 404s, and because
// tile parsing is the worker's whole job the map draws nothing while the markers,
// which are DOM overlays, appear as normal: a black rectangle with pins on it.
// `?worker&url` makes Vite emit the worker as its own bundled chunk and hands
// back a URL that is actually there.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useTheme } from "@/libs/theme/theme";
import type { MapViewProps, Pin } from "./MapView";

/**
 * The map itself: react-map-gl over MapLibre, tiles from OpenFreeMap.
 *
 * OpenFreeMap is the reason for MapLibre rather than an OSM iframe — vector
 * tiles, no API key, no quota, no domain to register, and a dark style, so the
 * map follows the app's theme instead of sitting in it as a white rectangle.
 *
 * react-map-gl is the reason this file is short. The map, its markers and the
 * hover card are all just components with props, so the marker set stays in
 * step with `pins` without a rebuild-everything effect, and the card is written
 * as JSX — which is what makes it safe, since a club name is written by whoever
 * owns the club and React escapes it on the way in.
 *
 * Only the camera is imperative, below, because "frame these pins" is an action
 * and not a piece of state.
 */

// At module scope so it is always in time: the workers start with whatever this
// says when the first map is constructed. It also runs during SSR, where it is a
// plain assignment to a module variable and no worker is ever started.
setWorkerUrl(workerUrl);

const STYLE = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

/** A single pin is an address being checked, so it opens close in. */
const ONE_PIN_ZOOM = 15;
/** Many pins are a directory: never so far in that the country is lost. */
const MANY_PIN_MAX_ZOOM = 12;

export default function MapCanvas({
  pins,
  onSelectPin,
  onMovePin,
  onViewChange,
  overlay,
  zoom = ONE_PIN_ZOOM,
  className,
}: MapViewProps) {
  const theme = useTheme();
  const map = useRef<MapRef>(null);
  const [hovered, setHovered] = useState<Pin | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Which pins, as opposed to where they are. The camera is moved when this
  // changes and not when a pin merely moves — otherwise dragging one would yank
  // the map back under the hand doing the dragging.
  const idKey = pins.map((p) => p.id).join("|");
  // The first frame is already right (see initialViewState), so the effect only
  // has later changes to catch: a different address picked in the settings form.
  const framed = useRef(pins.length ? idKey : "");
  const [initialViewState] = useState(() => initialView(pins, zoom));

  useEffect(() => {
    const current = map.current;
    if (!current || !loaded || !pins.length || framed.current === idKey) return;
    framed.current = idKey;

    if (pins.length === 1) {
      current.easeTo({ center: [pins[0].lon, pins[0].lat], zoom });
    } else {
      current.fitBounds(boundsOf(pins), {
        padding: 48,
        maxZoom: MANY_PIN_MAX_ZOOM,
        duration: 0,
      });
    }
  }, [idKey, pins, zoom, loaded]);

  // Whenever the style has layers that are not ours yet: the first load, the
  // theme swapping the style for the other one, and the rebuild MapLibre does
  // from scratch when a swap arrives mid-load, which throws the colours away
  // again. Asking the style what colour it currently is covers all three, and
  // is what stops the recolour from answering its own styledata event forever.
  //
  // (`isStyleLoaded()` is not the test to use: it stays false through every
  // styledata event of the initial load, so gating on it never repaints at all.)
  const repaint = (instance: MapLibreMap) => {
    const layers = instance.getStyle()?.layers;
    if (!layers) return;

    const p = palette();
    const background = layers.find((l) => l.type === "background");
    if (background?.paint?.["background-color"] === p.land) return;
    recolor(instance, p);
  };

  const report = (instance: { getBounds: MapRef["getBounds"] }) => {
    if (!onViewChange) return;
    const b = instance.getBounds();
    onViewChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
  };

  return (
    <div className={className}>
      <MapLibre
        ref={map}
        mapStyle={STYLE[theme]}
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
        attributionControl={{ compact: true }}
        onLoad={(e) => {
          setLoaded(true);
          report(e.target);
          repaint(e.target);
        }}
        onStyleData={(e) => repaint(e.target)}
        onMoveEnd={(e) => report(e.target)}
      >
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            longitude={pin.lon}
            latitude={pin.lat}
            anchor={pin.imageUrl ? "center" : "bottom"}
            // Markers are siblings in source order, so without a z-index a pin
            // grows underneath whichever pins come after it. Three layers, and
            // the order is the point: a club that has published a logo draws its
            // logo as the pin, and that is worth more of the map than a generic
            // teardrop — in Barcelona and Valencia the plain pins overlap it
            // into invisibility otherwise. Hover still wins over both.
            style={{
              zIndex: hovered?.id === pin.id ? 20 : pin.imageUrl ? 10 : 0,
            }}
            draggable={!!onMovePin}
            onClick={() => onSelectPin?.(pin)}
            onDragStart={() => setHovered(null)}
            onDragEnd={(e) => onMovePin?.(pin, e.lngLat.lat, e.lngLat.lng)}
          >
            {/* Our own glyph rather than Marker's `color`, because that one
                draws an element we cannot hang a hover on. It is also how the
                pin picks up --color-strike from the stylesheet instead of
                repeating the hex here. */}
            <div
              className={`origin-center transition-transform duration-150 hover:scale-115 ${onSelectPin ? "cursor-pointer" : ""}`}
              role={onSelectPin ? "button" : undefined}
              tabIndex={onSelectPin ? 0 : undefined}
              aria-label={onSelectPin ? pin.label : undefined}
              onMouseEnter={() => setHovered(pin)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(pin)}
              onBlur={() => setHovered(null)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                onSelectPin?.(pin);
              }}
            >
              {pin.imageUrl ? (
                // The logo is the pin. Same treatment Avatar gives a club mark:
                // white plate behind it, because these are drawn
                // dark-on-transparent and the map under them is near-black.
                <img
                  src={pin.imageUrl}
                  alt=""
                  className="h-10 w-10 rounded-full border-2 border-strike bg-white object-contain p-0.5 shadow-pop"
                />
              ) : (
                <PinGlyph />
              )}
            </div>
          </Marker>
        ))}

        {hovered && (
          <Popup
            longitude={hovered.lon}
            latitude={hovered.lat}
            closeButton={false}
            closeOnClick={false}
            className="map-popup"
            offset={30}
            maxWidth="280px"
          >
            {/* No logo here: the pin under the card already is the logo. */}
            <div className="max-w-full">
              <span className="block truncate text-body leading-tight font-semibold">
                {hovered.label}
              </span>
              {hovered.sublabel && (
                <span className="mt-0.5 block truncate text-caption text-ink-faint">
                  {hovered.sublabel}
                </span>
              )}
            </div>
          </Popup>
        )}
      </MapLibre>

      {/* Outside the map rather than a MapLibre control, so it is ordinary
          markup with the app's own components in it. z-10 clears the canvas;
          the hover card is z-20 and passes over it. */}
      {overlay && <div className="absolute top-2 right-2 z-10">{overlay}</div>}
    </div>
  );
}

/**
 * The basemap, in the app's colours.
 *
 * OpenFreeMap's two styles are grey-on-white and grey-on-black, and the page
 * around them is blue — the map reads as a screenshot dropped onto the page.
 * Rather than keeping edited copies of two 55-layer style JSONs in the repo,
 * every layer the style ships is repainted from the CSS tokens once it has
 * loaded. So the map follows a theme switch, follows the public skin's palette
 * (which is a different blue from the app's), and follows any later change to
 * the tokens, with nothing to keep in sync by hand.
 *
 * Layer ids are the OpenMapTiles schema, shared by both styles and by every
 * other style built on those tiles, so the patterns below are not tied to
 * positron in particular.
 */
const ROLES: [RegExp, keyof Palette][] = [
  // Order matters: the first pattern that matches an id wins.
  [/^(water|waterway)/, "water"],
  [/^(park|landcover_wood|landcover_grass)/, "green"],
  [/^building/, "built"],
  [/^boundary/, "border"],
  // A casing is the darker line drawn under a road to give it an edge. Painted
  // the same as the road it sits under it just makes the road twice as wide, so
  // it goes back to being the land: what is left is a single hairline per road.
  [/casing/, "land"],
  [/(motorway|_major|trunk|primary)/, "roadMajor"],
  [/^(highway|tunnel|bridge|railway|aeroway|road_)/, "road"],
];

type Palette = ReturnType<typeof palette>;

/**
 * `t` of `b` over `a`, both six-digit hex, which every surface and ink token is.
 * Anything else comes back as `a`: a road the colour of the land is invisible,
 * which is a duller failure than a thrown "Invalid color" that leaves the whole
 * basemap in its shipped grey.
 */
function mix(a: string, b: string, t: number) {
  const hex = /^#[0-9a-f]{6}$/i;
  if (!hex.test(a) || !hex.test(b)) return a;

  const channels = (c: string) =>
    [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const from = channels(a);
  const to = channels(b);
  const blended = from.map((v, i) => Math.round(v + (to[i] - v) * t));
  return `rgb(${blended.join(",")})`;
}

/**
 * Reads the tokens off <html>, where every theme and the public skin all
 * resolve, so this needs to know nothing about which of them is on.
 */
function palette() {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const land = token("--color-felt");
  const ink = token("--color-ink");

  return {
    land,
    water: token("--color-rail"),
    green: token("--color-pocket"),
    built: token("--color-felt-raised"),
    road: mix(land, ink, 0.1),
    roadMajor: mix(land, ink, 0.1),
    border: token("--color-ink-ghost"),
    label: token("--color-ink-faint"),
    labelStrong: token("--color-ink-soft"),
  };
}

function recolor(map: MapLibreMap, p: Palette) {
  for (const layer of map.getStyle().layers) {
    if (layer.type === "symbol") {
      // Places carry the map; street and water names are reference material.
      const place = /^(label_|airport)/.test(layer.id);
      map.setPaintProperty(
        layer.id,
        "text-color",
        place ? p.labelStrong : p.label,
      );
      // The halo is what keeps a label legible over a road or a coastline, so
      // it has to be the land it is printed on and not the white it shipped as.
      map.setPaintProperty(layer.id, "text-halo-color", p.land);
      continue;
    }

    const role = ROLES.find(([re]) => re.test(layer.id))?.[1] ?? "land";
    const color = p[role];

    if (layer.type === "background") {
      map.setPaintProperty(layer.id, "background-color", color);
    } else if (layer.type === "fill") {
      map.setPaintProperty(layer.id, "fill-color", color);
      // Positron outlines buildings in a grey that turns a city block into a
      // grid at zoom 16. Same colour as the fill: the outline stays gone.
      map.setPaintProperty(layer.id, "fill-outline-color", color);
    } else if (layer.type === "line") {
      map.setPaintProperty(layer.id, "line-color", color);
    }
  }
}

/** The classic teardrop, in the app's accent colour. */
function PinGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-strike" aria-hidden>
      <path
        d="M12 2c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill="currentColor"
        stroke="rgba(0,0,0,0.25)"
      />
      <circle cx="12" cy="9" r="2.6" fill="#fff" />
    </svg>
  );
}

const boundsOf = (pins: Pin[]) =>
  [
    [Math.min(...pins.map((p) => p.lon)), Math.min(...pins.map((p) => p.lat))],
    [Math.max(...pins.map((p) => p.lon)), Math.max(...pins.map((p) => p.lat))],
  ] as [[number, number], [number, number]];

/**
 * Where the map opens, worked out before the first frame rather than eased into
 * afterwards — a map that starts at the whole world and flies in reads as
 * having been wrong for a second.
 */
function initialView(pins: Pin[], zoom: number) {
  if (pins.length === 1) {
    return { longitude: pins[0].lon, latitude: pins[0].lat, zoom };
  }
  if (pins.length > 1) {
    return {
      bounds: boundsOf(pins),
      fitBoundsOptions: { padding: 48, maxZoom: MANY_PIN_MAX_ZOOM },
    };
  }
  return { longitude: 0, latitude: 20, zoom: 1 };
}
