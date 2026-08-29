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
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useClubTables, useManageClubTables } from "@/hooks/useClubTables";
import { useClubMembers, useManageClub } from "@/hooks/useClub";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button, IconButton } from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useT } from "@/i18n";

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

      // start_device_pairing takes a table now, and the generated types still
      // carry the one-argument version. Narrow cast until sql/device-pairing.sql
      // is applied and `npm run db:types` re-run.
      const rpc = supabase as unknown as {
        rpc: (
          fn: string,
          args: Record<string, number>,
        ) => PromiseLike<{
          data: string | null;
          error: { message: string } | null;
        }>;
      };

      const { data, error } = await rpc.rpc("start_device_pairing", {
        cid: activeClubId,
        tid: tableId,
      });
      if (error || !data) throw new Error(error?.message ?? "no code");
      return data;
    },
    onSuccess: (code, tableId) => setPairing({ tableId, code }),
    onError: () => toast.error(t("common.error")),
  });

  const add = () => {
    const next = label.trim();
    if (!next) return;
    addTable.mutate(next, {
      onSuccess: () => setLabel(""),
      // Almost always the unique index: this club already has a table by that
      // name.
      onError: () => toast.error(t("tables.duplicate")),
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
            <li key={table.id} className="px-4 py-2">
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
