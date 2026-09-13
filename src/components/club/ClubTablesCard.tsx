import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { renderSVG } from "uqr";
import {
  LuMonitorSmartphone,
  LuPlus,
  LuTrash2,
  LuUnlink,
} from "react-icons/lu";
import { supabase } from "@/libs/supabase/browser";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import { useAuth } from "@/hooks/useAuth";
import { useClubTables, useManageClubTables } from "@/hooks/useClubTables";
import { useClubMembers, useManageClub } from "@/hooks/useClub";
import TableTypePicker from "@/components/club/TableTypePicker";
import { Card, CardHeader } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Button, IconButton } from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/Skeleton";
import {
  TABLE_SIZES_BY_TYPE,
  type ClubTable,
  type TableSize,
  type TableType,
} from "@/types";
import { useT } from "@/i18n";

/**
 * The room's own facts about one table: what it's built for, how big, who
 * made it, what's on it. Folded behind a Collapsible for the same reason
 * ClubInfoPage's pickers are — four more fields per row would otherwise
 * triple the height of a card meant to be scanned as a list of names.
 *
 * Staged as one local patch rather than saved field-by-field like the label
 * input: type and size have to reach the database together whenever either
 * changes (club_tables_type_size_check evaluates the whole row), which a
 * save-on-blur input can't express.
 */
function TableDetailsEditor({
  table,
  otherTables,
}: {
  table: ClubTable;
  /** The rest of the club's tables, to offer as copy sources — most rooms
   *  are the same three or four table specs repeated, and retyping brand and
   *  felt on every row is exactly the busywork a "same as 1" picker exists
   *  to skip. */
  otherTables: ClubTable[];
}) {
  const { t } = useT();
  const { updateTableDetails } = useManageClubTables();
  const [type, setType] = useState<TableType | undefined>(undefined);
  const [size, setSize] = useState<TableSize | null | undefined>(undefined);
  const [brand, setBrand] = useState<string | undefined>(undefined);
  const [felt, setFelt] = useState<string | undefined>(undefined);

  const shownType = type !== undefined ? type : table.type;
  const shownSize = size !== undefined ? size : table.size;
  const shownBrand = brand !== undefined ? brand : (table.brand ?? "");
  const shownFelt = felt !== undefined ? felt : (table.felt ?? "");

  const hasChanges =
    type !== undefined ||
    size !== undefined ||
    brand !== undefined ||
    felt !== undefined;

  // Only tables with a type set are worth offering — copying "nothing" from
  // an unconfigured table would just be a longer way to clear the form.
  const copySources = otherTables.filter((t) => t.type);

  const copyFrom = (sourceId: number) => {
    const source = copySources.find((t) => t.id === sourceId);
    if (!source) return;
    setType(source.type ?? undefined);
    setSize(source.size);
    setBrand(source.brand ?? "");
    setFelt(source.felt ?? "");
  };

  const summary = shownType
    ? [
        [shownSize, t(`tables.type.${shownType}`)].filter(Boolean).join(" "),
        shownBrand,
        shownFelt,
      ]
        .filter(Boolean)
        .join(" · ")
    : t("tables.detailsSummaryEmpty");

  const save = () => {
    updateTableDetails.mutate(
      {
        id: table.id,
        ...(type !== undefined && { type }),
        ...(size !== undefined && { size }),
        ...(brand !== undefined && { brand }),
        ...(felt !== undefined && { felt }),
      },
      {
        onSuccess: () => {
          setType(undefined);
          setSize(undefined);
          setBrand(undefined);
          setFelt(undefined);
        },
        onError: (err) =>
          toast.error(
            t(
              dbErrorMessage(err, "updateTableDetails", {
                denied: "common.deniedError",
              }),
            ),
          ),
      },
    );
  };

  return (
    <Collapsible
      label={t("tables.detailsTitle")}
      hint={t("tables.detailsHint")}
      value={summary}
      // The list's own divider is what separates one table from the next;
      // a second border here, between a table's row and its own details,
      // read as a third table between every real pair of them.
      bordered={false}
    >
      {copySources.length > 0 && (
        <div className="max-w-xs">
          <Label htmlFor={`table-copy-${table.id}`}>
            {t("tables.copyFrom")}
          </Label>
          <Select
            id={`table-copy-${table.id}`}
            // Always reset to the placeholder: this is a one-shot "copy
            // now" action, not a binding to keep this table in sync with
            // another one — the fields above are what gets saved.
            value=""
            onChange={(e) => {
              if (e.target.value) copyFrom(Number(e.target.value));
            }}
            disabled={updateTableDetails.isPending}
          >
            <option value="" disabled>
              {t("tables.copyFromPlaceholder")}
            </option>
            {copySources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.label}
              </option>
            ))}
          </Select>
        </div>
      )}
      <TableTypePicker
        value={shownType}
        onChange={(next) => {
          setType(next);
          // A size left over from the old type may not be valid for the new
          // one — club_tables_type_size_check would reject it, so clear it
          // here rather than surface that as a database error.
          if (shownSize && !TABLE_SIZES_BY_TYPE[next].includes(shownSize))
            setSize(null);
        }}
        disabled={updateTableDetails.isPending}
      />
      <div className="flex flex-wrap gap-3">
        <div className="min-w-32 flex-1">
          <Label htmlFor={`table-size-${table.id}`}>{t("tables.size")}</Label>
          <Select
            id={`table-size-${table.id}`}
            value={shownSize ?? ""}
            onChange={(e) =>
              setSize((e.target.value || null) as TableSize | null)
            }
            disabled={!shownType || updateTableDetails.isPending}
          >
            <option value="" disabled>
              {shownType ? t("tables.sizePlaceholder") : t("tables.sizeNoType")}
            </option>
            {(shownType ? TABLE_SIZES_BY_TYPE[shownType] : []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-32 flex-1">
          <Label htmlFor={`table-brand-${table.id}`}>{t("tables.brand")}</Label>
          <Input
            id={`table-brand-${table.id}`}
            value={shownBrand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder={t("tables.brandPlaceholder")}
            maxLength={60}
            disabled={updateTableDetails.isPending}
          />
        </div>
        <div className="min-w-32 flex-1">
          <Label htmlFor={`table-felt-${table.id}`}>{t("tables.felt")}</Label>
          <Input
            id={`table-felt-${table.id}`}
            value={shownFelt}
            onChange={(e) => setFelt(e.target.value)}
            placeholder={t("tables.feltPlaceholder")}
            maxLength={60}
            disabled={updateTableDetails.isPending}
          />
        </div>
      </div>
      <Button
        size="sm"
        onClick={save}
        disabled={!hasChanges || updateTableDetails.isPending}
      >
        {t("tables.saveDetails")}
      </Button>
    </Collapsible>
  );
}

/**
 * The club's tables, on the club's own page.
 *
 * A list of labels, because that is all a table is here — what is painted on
 * the wall, so that a match can say which one it is on. No reordering: the list
 * comes out in the order it was typed, which is the order a room numbers its
 * tables in.
 */
export default function ClubTablesCard() {
  const { t } = useT();
  const { activeClubId } = useAuth();
  // The QR needs an absolute URL, and `window` is not there on the server —
  // the root route already reads the origin off the request for the invite
  // poster.
  const { origin } = getRouteApi("__root__").useRouteContext();
  const { data: tables, isLoading } = useClubTables();
  // The devices, from the full membership list rather than the roster — the
  // roster filters them out precisely because they are not players.
  const { data: members } = useClubMembers();
  const { removeMember } = useManageClub();
  const { addTable, renameTable, removeTable } = useManageClubTables();
  const [label, setLabel] = useState("");
  /** The code just cut, and which table it was cut for. One at a time: it is
   *  read off this screen and typed into a tablet standing at that table. */
  const [pairing, setPairing] = useState<{
    tableId: number;
    code: string;
  } | null>(null);

  /** The same link the tablet would reach by typing, with the code in it, as a
   *  symbol the tablet's camera can read. ecc M and a 4-module quiet zone for
   *  the same reason the invite poster uses them: a code read across a room off
   *  a screen at an angle. */
  const pairQr = useMemo(() => {
    if (!pairing) return null;
    const link = `${origin}/app/pair?code=${pairing.code}`;
    return {
      link,
      svg: renderSVG(link, { ecc: "M", border: 4, pixelSize: 1 }),
    };
  }, [origin, pairing]);

  const deviceOn = (tableId: number) =>
    (members ?? []).find((m) => m.is_device && m.device_table_id === tableId);

  const startPairing = useMutation({
    mutationFn: async (tableId: number): Promise<string> => {
      if (!activeClubId) throw new Error("no active club");

      const { data, error } = await supabase.rpc("start_device_pairing", {
        cid: activeClubId,
        tid: tableId,
      });
      // Thrown rather than wrapped so the PostgrestError's own code reaches
      // the caller, same reason as useLiveMatch's startMatch.
      if (error) throw error;
      if (!data) throw new Error("no code");
      return data;
    },
    onSuccess: (code, tableId) => setPairing({ tableId, code }),
    onError: (err) =>
      toast.error(
        t(
          dbErrorMessage(err, "startPairing", {
            denied: "common.deniedError",
          }),
        ),
      ),
  });

  const add = () => {
    const next = label.trim();
    if (!next) return;
    addTable.mutate(next, {
      onSuccess: () => setLabel(""),
      // Almost always the unique index: this club already has a table by that
      // name.
      onError: (err) =>
        toast.error(
          t(
            dbErrorMessage(err, "addTable", {
              duplicate: "tables.duplicate",
              denied: "common.deniedError",
              fallback: "tables.duplicate",
            }),
          ),
        ),
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={
          <span className="flex items-baseline gap-2">
            {t("tables.title")}
            <span className="text-caption font-normal tabular-nums text-ink-faint">
              {(tables ?? []).length}
            </span>
          </span>
        }
      />

      {isLoading ? (
        <div className="p-3">
          <SkeletonRows />
        </div>
      ) : (
        <ul className="divide-y divide-hairline">
          {(tables ?? []).map((table) => (
            <li key={table.id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Input
                  defaultValue={table.label}
                  aria-label={t("tables.label")}
                  className="flex-1"
                  // Saved on blur rather than behind an edit button: the whole
                  // field is one short label, and a rename is rare enough that
                  // a dedicated mode would be more chrome than the job needs.
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (!next || next === table.label) {
                      e.target.value = table.label;
                      return;
                    }
                    renameTable.mutate({ id: table.id, label: next });
                  }}
                />
                {/* Per table, because the code is what pins the tablet: it is
                    cut for this table and redeeming it puts the device on it.
                    Once one is paired the row shows that instead — a table has
                    one screen. */}
                {deviceOn(table.id) ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-control border border-hairline px-2 py-1 text-caption text-ink-soft">
                    <LuMonitorSmartphone className="h-3.5 w-3.5" aria-hidden />
                    {t("kiosk.deviceOn")}
                  </span>
                ) : (
                  <IconButton
                    label={t("kiosk.pairTable", { name: table.label })}
                    onClick={() => startPairing.mutate(table.id)}
                    disabled={startPairing.isPending}
                  >
                    <LuMonitorSmartphone className="h-4 w-4" aria-hidden />
                  </IconButton>
                )}
                <IconButton
                  label={
                    deviceOn(table.id)
                      ? t("kiosk.removeDevice")
                      : t("common.delete")
                  }
                  tone="danger"
                  onClick={() => {
                    // Taking the tablet back is a different act from retiring
                    // the table, and while a table has one the tablet is what
                    // the button is for.
                    const device = deviceOn(table.id);
                    if (device) {
                      if (confirm(t("kiosk.removeConfirm")))
                        removeMember.mutate(device.id);
                      return;
                    }
                    if (
                      !confirm(t("tables.removeConfirm", { name: table.label }))
                    )
                      return;
                    removeTable.mutate(table.id);
                  }}
                >
                  {deviceOn(table.id) ? (
                    <LuUnlink className="h-4 w-4" aria-hidden />
                  ) : (
                    <LuTrash2 className="h-4 w-4" aria-hidden />
                  )}
                </IconButton>
              </div>

              {pairing?.tableId === table.id && pairQr && (
                <div className="mt-2 flex items-center gap-3 rounded-card bg-felt-raised p-3">
                  {/* White behind it always: the app is dark by default and a
                      QR inverted is a QR most cameras will not read. The input
                      is our own URL — nothing user-written. */}
                  <div
                    className="h-56 w-56 shrink-0 rounded-control bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
                    role="img"
                    aria-label={pairQr.link}
                    dangerouslySetInnerHTML={{ __html: pairQr.svg }}
                  />
                  <div className="min-w-0 space-y-1">
                    {/* Still spelled out: the fallback when the tablet has no
                        camera, or the scan lands somewhere odd. */}
                    <p className="font-mono text-h2 font-semibold tracking-[0.2em] text-ink">
                      {pairing.code}
                    </p>
                    <p className="text-caption text-ink-faint">
                      {t("kiosk.pairCode", { name: table.label })}
                    </p>
                  </div>
                </div>
              )}

              <TableDetailsEditor
                table={table}
                otherTables={(tables ?? []).filter((t) => t.id !== table.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 border-t border-hairline p-3">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("tables.labelPlaceholder")}
          aria-label={t("tables.label")}
          maxLength={24}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            add();
          }}
        />
        <Button onClick={add} disabled={!label.trim() || addTable.isPending}>
          <LuPlus className="h-4 w-4" aria-hidden />
          {t("tables.add")}
        </Button>
      </div>
    </Card>
  );
}
