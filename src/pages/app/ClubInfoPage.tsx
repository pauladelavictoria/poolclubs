import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { LuChevronRight } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useManageClub } from "@/hooks/useClub";
import ClubLogoUpload from "@/components/club/ClubLogoUpload";
import ClubThemePicker from "@/components/club/ClubThemePicker";
import ClubLocationPicker from "@/components/club/ClubLocationPicker";
import { BallGlyph } from "@/components/ui/Ball";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { CLUB_TZ, DAY_START_HOUR, zoneOf } from "@/libs/day";
import type { Place } from "@/libs/geocode";
import { CLUB_BALL_COLORS, type BallColor } from "@/types";
import { useT } from "@/i18n";

/**
 * Every zone this browser knows, or the club's own if it knows none — the list
 * is 400-odd names and Intl already has it, so shipping a table of them would be
 * a copy that goes stale. Sorted, because it is a select somebody scrolls.
 */
const ZONES: string[] = (() => {
  const supported = Intl.supportedValuesOf?.("timeZone") ?? [];
  return supported.length > 0 ? [...supported].sort() : [CLUB_TZ];
})();

/**
 * A setting folded away behind what it is currently set to.
 *
 * The accent, the address and the clock are each chosen once and then left
 * alone, but the pickers for them are the three tallest things on this page —
 * open, they push the name field and the save button off the screen. Collapsed,
 * the summary still answers the only question anyone has when scrolling past:
 * what is it set to right now.
 *
 * Native <details>, so open/close, keyboard and screen-reader semantics cost
 * nothing. The value shown is the *staged* one, not the saved one — this page
 * batches its edits into one save, and a summary that reverted to the old colour
 * the moment you collapsed it would be lying.
 */
function Collapsible({
  label,
  hint,
  value,
  children,
}: {
  label: string;
  hint: string;
  value: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group mt-5 border-t border-hairline pt-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <LuChevronRight
          className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150 group-open:rotate-90"
          aria-hidden
        />
        <span className="min-w-0 flex-1 text-body font-medium text-ink">
          {label}
        </span>
        <span className="shrink-0 text-caption text-ink-faint group-open:hidden">
          {value}
        </span>
      </summary>
      <div className="mt-3 space-y-3 pl-6">
        <p className="text-body text-ink-soft">{hint}</p>
        {children}
      </div>
    </details>
  );
}

/**
 * What the club is: its name, its crest, its accent, where it is and what clock
 * it keeps.
 *
 * One form and one Save for all of it. Every field stages into local state where
 * `undefined` means "untouched", so the patch sent to `updateClub` carries only
 * what the admin actually changed rather than rewriting every column on every
 * save.
 */
export default function ClubInfoPage() {
  const { t } = useT();
  const { activeClub } = useAuth();
  const { updateClub } = useManageClub();

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(undefined);
  const [color, setColor] = useState<BallColor | undefined>(undefined);
  const [isPublic, setIsPublic] = useState<boolean | undefined>(undefined);
  const [location, setLocation] = useState<Place | null | undefined>(undefined);
  const [timezone, setTimezone] = useState<string | undefined>(undefined);

  // Admin-only, enforced by the route's beforeLoad before this renders.

  // The five location columns are written together, so a club either has
  // coordinates or has no location at all.
  const savedPlace: Place | null =
    activeClub.lat !== null && activeClub.lon !== null
      ? {
          address: activeClub.address ?? "",
          city: activeClub.city ?? "",
          country: activeClub.country ?? "",
          lat: activeClub.lat,
          lon: activeClub.lon,
        }
      : null;

  const shownColor = color ?? activeClub.theme_color;
  const shownPlace = location !== undefined ? location : savedPlace;
  const shownZone = timezone ?? zoneOf(activeClub);
  const shownPublic = isPublic ?? activeClub.is_public;

  const hasChanges =
    name.trim().length > 0 ||
    logoUrl !== undefined ||
    color !== undefined ||
    isPublic !== undefined ||
    location !== undefined ||
    timezone !== undefined;

  const saveSettings = () => {
    updateClub.mutate(
      {
        ...(name.trim() && { name: name.trim() }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(color !== undefined && { themeColor: color }),
        ...(isPublic !== undefined && { isPublic }),
        ...(location !== undefined && { location }),
        ...(timezone !== undefined && { timezone }),
      },
      {
        onSuccess: () => {
          setName("");
          setLogoUrl(undefined);
          setColor(undefined);
          setIsPublic(undefined);
          setLocation(undefined);
          setTimezone(undefined);
          toast.success(t("common.saved"));
        },
        onError: () => toast.error(t("common.error")),
      },
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader title={t("club.tabs.info")} />
      <form
        className="p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!hasChanges) return;
          saveSettings();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="rename">{t("club.rename")}</Label>
          <Input
            id="rename"
            value={name}
            maxLength={60}
            placeholder={activeClub.name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="mt-5 space-y-1.5 border-t border-hairline pt-4">
          <Label>{t("club.branding.logoTitle")}</Label>
          <ClubLogoUpload
            name={activeClub.name}
            url={logoUrl !== undefined ? logoUrl : activeClub.logo_url}
            onChange={setLogoUrl}
            disabled={updateClub.isPending}
          />
        </div>

        <Collapsible
          label={t("club.branding.colorTitle")}
          hint={t("club.branding.colorHint")}
          value={
            <span className="flex items-center gap-1.5">
              <BallGlyph
                color={shownColor}
                label={String(CLUB_BALL_COLORS.indexOf(shownColor) + 1)}
                className="h-4 w-4"
              />
              {t(`club.branding.ball.${shownColor}`)}
            </span>
          }
        >
          <ClubThemePicker
            value={shownColor}
            onChange={setColor}
            disabled={updateClub.isPending}
          />
        </Collapsible>

        <Collapsible
          label={t("club.location.title")}
          hint={t("club.location.hint")}
          value={
            shownPlace
              ? [shownPlace.city, shownPlace.country]
                  .filter(Boolean)
                  .join(", ") || t("club.location.set")
              : t("club.location.notSet")
          }
        >
          <ClubLocationPicker
            value={shownPlace}
            onChange={setLocation}
            disabled={updateClub.isPending}
          />
        </Collapsible>

        {/* The club's clock. Not derived from the location above: a country
            is not a zone — Spain is two of them — and a night that rolls
            over at the wrong hour files the last three races of it into the
            wrong day. See libs/day.ts. */}
        <Collapsible
          label={t("club.timezone")}
          hint={t("club.timezoneHint", { hour: DAY_START_HOUR })}
          value={shownZone}
        >
          <Select
            id="club-timezone"
            aria-label={t("club.timezone")}
            value={shownZone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={updateClub.isPending}
          >
            {ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
        </Collapsible>

        <div className="mt-5 space-y-2 border-t border-hairline pt-4">
          <Toggle
            checked={shownPublic}
            onChange={setIsPublic}
            label={t("club.publicListing")}
            hint={t("club.publicListingHint")}
            disabled={updateClub.isPending}
          />
          {shownPublic && (
            <Link
              to="/clubs/$slug"
              params={{ slug: activeClub.slug }}
              className="inline-block pl-7 text-caption font-medium text-strike transition-colors duration-150 hover:text-strike-light"
            >
              {t("club.viewPublicPage")}
            </Link>
          )}
        </div>

        <Button
          type="submit"
          variant="secondary"
          className="mt-5"
          disabled={!hasChanges || updateClub.isPending}
        >
          {t("common.save")}
        </Button>
      </form>
    </Card>
  );
}
