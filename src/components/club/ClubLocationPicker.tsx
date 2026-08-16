import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LuMapPin } from "react-icons/lu";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import MapView from "@/components/map/MapView";
import { keys } from "@/libs/queryKeys";
import { searchPlaces } from "@/libs/geocode.functions";
import { countryName, placeLabel, type Place } from "@/libs/geocode";
import { useT } from "@/i18n";

/** Below this, every query matches half the planet. */
const MIN_QUERY = 3;

/**
 * Where the club is: searched, then corrected.
 *
 * The admin searches an address and picks a suggestion, and the pick carries
 * its own coordinates — so there is no separate "geocode this" step that can
 * fail after the save. What the geocoder returns is a starting point, not the
 * answer: OpenStreetMap does not hold every house number, so a search for
 * "Calle Mayor 12" can come back as the street. The street line stays editable
 * and the pin stays draggable for exactly that case.
 *
 * Nothing here writes to the database. The pick lands in the settings form's
 * state and goes with the one Guardar, like the logo and the colour.
 */
export default function ClubLocationPicker({
  value,
  onChange,
  disabled,
}: {
  value: Place | null;
  onChange: (place: Place | null) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useT();
  const [text, setText] = useState("");
  // The box is local and the query catches up once the typing stops: a fetch
  // per keystroke is what Photon's usage policy asks callers not to do.
  const [term, setTerm] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setTerm(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);

  const { data: results, isFetching } = useQuery({
    queryKey: keys.places.for(term),
    queryFn: () => searchPlaces({ data: { q: term } }),
    enabled: term.length >= MIN_QUERY,
    // The same address searched twice in one sitting is the same answer.
    staleTime: 5 * 60_000,
  });

  const pick = (place: Place) => {
    onChange(place);
    setText("");
    setTerm("");
  };

  const searching = term.length >= MIN_QUERY;
  const empty = searching && !isFetching && results?.length === 0;

  return (
    <div className="space-y-2">
      <Input
        value={text}
        disabled={disabled}
        maxLength={120}
        autoComplete="off"
        placeholder={t("club.location.placeholder")}
        aria-label={t("club.location.search")}
        onChange={(e) => setText(e.target.value)}
      />

      {results && results.length > 0 && (
        <ul className="divide-y divide-hairline overflow-hidden rounded-control border border-hairline">
          {results.map((place) => (
            <li key={`${place.lat},${place.lon},${place.address}`}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => pick(place)}
                className="block w-full px-3 py-2 text-left text-body text-ink transition-colors duration-150 hover:bg-pocket disabled:cursor-not-allowed"
              >
                {placeLabel(place, locale)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* One live region for both states, so a screen reader hears the search
          settle rather than only seeing the list appear. */}
      <p
        role="status"
        aria-live="polite"
        className="text-caption text-ink-faint"
      >
        {isFetching
          ? t("club.location.searching")
          : empty
            ? t("club.location.noResults")
            : ""}
      </p>

      {value && (
        <div className="space-y-3 rounded-control border border-hairline p-3">
          <div className="flex items-start gap-2">
            <LuMapPin
              className="mt-0.5 h-4 w-4 shrink-0 text-strike"
              aria-hidden
            />
            <p className="min-w-0 flex-1 text-body text-ink-soft">
              {[value.city, countryName(value.country, locale)]
                .filter(Boolean)
                .join(", ")}
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              {t("club.location.clear")}
            </Button>
          </div>

          {/* Editable, because the geocoder's idea of the address is a
              suggestion. The coordinates below are what actually locates the
              club, and they do not change when this line does. */}
          <div className="space-y-1.5">
            <Label htmlFor="club-street">{t("club.location.street")}</Label>
            <Input
              id="club-street"
              value={value.address}
              disabled={disabled}
              maxLength={120}
              placeholder={t("club.location.streetPlaceholder")}
              onChange={(e) => onChange({ ...value, address: e.target.value })}
            />
          </div>

          <MapView
            className="h-56 w-full"
            pins={[
              {
                // The address, not the coordinates: the map refits when a
                // different place is picked and holds still while the pin is
                // being dragged.
                id: `${value.address}|${value.city}`,
                lat: value.lat,
                lon: value.lon,
                label: placeLabel(value, locale),
              },
            ]}
            onMovePin={
              disabled
                ? undefined
                : (_, lat, lon) => onChange({ ...value, lat, lon })
            }
          />
          <p className="text-caption text-ink-faint">
            {t("club.location.mapHint")}
          </p>
        </div>
      )}
    </div>
  );
}
