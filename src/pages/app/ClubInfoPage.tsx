import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { LuChevronRight } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useManageClub } from "@/hooks/useClub";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import ClubLogoUpload from "@/components/club/ClubLogoUpload";
import ClubThemePicker from "@/components/club/ClubThemePicker";
import ClubLocationPicker from "@/components/club/ClubLocationPicker";
import ClubScheduleEditor from "@/components/club/ClubScheduleEditor";
import ClubPhotosUpload from "@/components/club/ClubPhotosUpload";
import { BallGlyph } from "@/components/ui/Ball";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { CLUB_TZ, DAY_START_HOUR, zoneOf } from "@/libs/algorithms/day";
import {
  WEEKDAYS,
  parseSchedule,
  type Schedule,
} from "@/libs/algorithms/schedule";
import type { Place } from "@/libs/algorithms/geocode";
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
  const [description, setDescription] = useState<string | undefined>(undefined);
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [contactEmail, setContactEmail] = useState<string | undefined>(
    undefined,
  );
  const [tablesInfo, setTablesInfo] = useState<string | undefined>(undefined);
  const [schedule, setSchedule] = useState<Schedule | undefined>(undefined);

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
  const shownDescription = description ?? activeClub.description ?? "";
  const shownPhone = phone ?? activeClub.phone ?? "";
  const shownContactEmail = contactEmail ?? activeClub.contact_email ?? "";
  const shownTables = tablesInfo ?? activeClub.tables_info ?? "";
  // Parsed rather than cast: the column is jsonb with no CHECK, so what comes
  // back is whatever is in the row. See libs/algorithms/schedule.ts.
  const shownSchedule = schedule ?? parseSchedule(activeClub.schedule);
  const openDays = WEEKDAYS.filter((d) => shownSchedule[d]?.length).length;

  const hasChanges =
    name.trim().length > 0 ||
    logoUrl !== undefined ||
    color !== undefined ||
    isPublic !== undefined ||
    location !== undefined ||
    timezone !== undefined ||
    description !== undefined ||
    phone !== undefined ||
    contactEmail !== undefined ||
    tablesInfo !== undefined ||
    schedule !== undefined;

  const saveSettings = () => {
    updateClub.mutate(
      {
        ...(name.trim() && { name: name.trim() }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(color !== undefined && { themeColor: color }),
        ...(isPublic !== undefined && { isPublic }),
        ...(location !== undefined && { location }),
        ...(timezone !== undefined && { timezone }),
        ...(description !== undefined && { description }),
        ...(phone !== undefined && { phone }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(tablesInfo !== undefined && { tablesInfo }),
        ...(schedule !== undefined && { schedule }),
      },
      {
        onSuccess: () => {
          setName("");
          setLogoUrl(undefined);
          setColor(undefined);
          setIsPublic(undefined);
          setLocation(undefined);
          setTimezone(undefined);
          setDescription(undefined);
          setPhone(undefined);
          setContactEmail(undefined);
          setTablesInfo(undefined);
          setSchedule(undefined);
          toast.success(t("common.saved"));
        },
        onError: (err) =>
          toast.error(
            t(
              dbErrorMessage(err, "updateClub", {
                denied: "common.deniedError",
              }),
            ),
          ),
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

        {/* Both only ever appear on the public page, so they sit together and
            after the location rather than up with the name. */}
        <div className="mt-5 space-y-1.5 border-t border-hairline pt-4">
          <Label htmlFor="club-description">{t("club.description")}</Label>
          <Textarea
            id="club-description"
            rows={3}
            maxLength={500}
            value={shownDescription}
            placeholder={t("club.descriptionPlaceholder")}
            disabled={updateClub.isPending}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="club-phone">{t("club.phone")}</Label>
          {/* type="tel" for the phone keypad on a handset. Not validated and
              not normalised: it is rendered as a tel: link and dialled, never
              parsed, and every country writes them differently. */}
          <Input
            id="club-phone"
            type="tel"
            maxLength={30}
            value={shownPhone}
            placeholder={t("club.phonePlaceholder")}
            disabled={updateClub.isPending}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="club-contact-email">{t("club.contactEmail")}</Label>
          {/* type="email" for the keyboard and the browser's own check. The
              database has a loose shape CHECK behind it (sql/schema.sql); a
              strict pattern turns away addresses that are perfectly valid. */}
          <Input
            id="club-contact-email"
            type="email"
            maxLength={120}
            value={shownContactEmail}
            placeholder={t("club.contactEmailPlaceholder")}
            disabled={updateClub.isPending}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <p className="text-caption text-ink-faint">
            {t("club.contactEmailHint")}
          </p>
        </div>

        {/* The room itself, in prose. Not club_tables, which is the list of
            tablets bolted to each table and never leaves the app — this is what
            a stranger reads before deciding to come. */}
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="club-tables">{t("club.tablesInfo")}</Label>
          <Textarea
            id="club-tables"
            rows={2}
            maxLength={300}
            value={shownTables}
            placeholder={t("club.tablesInfoPlaceholder")}
            disabled={updateClub.isPending}
            onChange={(e) => setTablesInfo(e.target.value)}
          />
        </div>

        {/* Saves itself rather than staging into this form — see the note in
            ClubPhotosUpload. The one control here that is not part of the
            Guardar below. */}
        <Collapsible
          label={t("club.photos.title")}
          hint={t("club.photos.hint")}
          value={t("club.photos.manage")}
        >
          <ClubPhotosUpload disabled={updateClub.isPending} />
        </Collapsible>

        <Collapsible
          label={t("club.schedule.title")}
          hint={t("club.schedule.hint")}
          value={
            openDays > 0
              ? t("club.schedule.openDays", { n: String(openDays) })
              : t("club.schedule.notSet")
          }
        >
          <ClubScheduleEditor
            value={shownSchedule}
            onChange={setSchedule}
            disabled={updateClub.isPending}
          />
        </Collapsible>

        {/* The club's clock. Not derived from the location above: a country
            is not a zone — Spain is two of them — and a night that rolls
            over at the wrong hour files the last three races of it into the
            wrong day. See libs/algorithms/day.ts. */}
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
