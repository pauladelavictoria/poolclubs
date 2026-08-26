import { useState } from "react";
import { LuMonitorSmartphone } from "react-icons/lu";
import { pairDevice } from "@/libs/auth.functions";
import { pinKioskAndOpen } from "@/libs/kiosk";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";

/**
 * The screen a tablet sees once, before it becomes the table's own.
 *
 * Outside the signed-in guard, because a device arriving here has no account at
 * all — the code is what gets it one. Six characters, no ambiguous letters, and
 * a keyboard that only offers what the alphabet contains.
 */
export default function PairDevicePage() {
  const { t } = useT();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    setError(null);

    const result = await pairDevice({ data: { code } });

    if ("error" in result) {
      setError(
        t(
          result.error === "anonymousDisabled"
            ? "pair.anonymousDisabled"
            : result.error === "alreadyPaired"
              ? "pair.alreadyPaired"
              : "pair.badCode",
        ),
      );
      setPending(false);
      return;
    }

    // The code was cut for one table, so redeeming it is the whole setup: this
    // device is now the club's, and it is that table's. Pinning here rather
    // than leaving somebody to find the control is the difference between a
    // tablet that is ready and one sitting on a club home page.
    pinKioskAndOpen(
      result.tableId,
      `/app/${result.clubSlug}/tables/${result.tableId}`,
    );
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center px-4 py-8">
      <Card className="w-full space-y-5 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-felt-raised text-ink-faint">
            <LuMonitorSmartphone className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-h3 font-semibold text-ink">
              {t("pair.title")}
            </h1>
            <p className="text-caption text-ink-faint">{t("pair.hint")}</p>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6 && !pending) void submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="pair-code">{t("pair.code")}</Label>
            <Input
              id="pair-code"
              value={code}
              onChange={(e) =>
                // Upper case and stripped as it is typed: the code is printed
                // in one case and a tablet keyboard offers the other.
                setCode(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
                )
              }
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              placeholder="ABC123"
              className="text-center font-mono text-h2 tracking-[0.3em]"
              disabled={pending}
            />
          </div>

          {error && <p className="text-caption text-strike">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={code.length !== 6 || pending}
          >
            {pending ? t("pair.pairing") : t("pair.submit")}
          </Button>
        </form>

        <p className="text-caption text-ink-faint">{t("pair.footer")}</p>
      </Card>
    </div>
  );
}
