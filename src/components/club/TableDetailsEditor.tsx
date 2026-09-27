import { useState } from "react";
import { toast } from "react-toastify";
import { dbErrorMessage } from "@/libs/algorithms/dbError";
import { useManageClubTables } from "@/hooks/useClubTables";
import TableTypePicker from "@/components/club/TableTypePicker";
import { Collapsible } from "@/components/ui/Collapsible";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
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
export function TableDetailsEditor({
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
          toast.error(t(dbErrorMessage(err, "updateTableDetails"))),
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
