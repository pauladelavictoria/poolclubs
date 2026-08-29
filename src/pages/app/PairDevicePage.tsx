import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { LuCheck, LuMonitorSmartphone, LuShare2 } from "react-icons/lu";
import { pairDevice } from "@/libs/auth.functions";
import { pinKioskAndOpen } from "@/libs/kiosk";
import { canOfferInstall } from "@/libs/installPrompt";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
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
 *
 * A device that scanned the QR on the club's settings screen arrives with the
 * code already in the URL, so the field is filled and there is nothing to do
 * but press the button. Not auto-submitted: the same six characters are still
 * one-shot, and somebody who scans the wrong screen should be able to back out.
 *
 * Then the install offer, before the tablet leaves for its table. This is the
 * one moment somebody is holding the device on purpose, and a paired tablet
 * lives on the home screen or it lives in a browser tab that somebody closes —
 * the club shell's own install modal never reaches it, because a pinned device
 * renders full-bleed pages with no prompts. Where there is nothing to install
 * (already standalone, or a browser with no install at all) the step is skipped
 * and pairing goes straight through, as it did before.
 */

/** Codes are printed in one case and a tablet keyboard offers the other. Same
 *  cleanup for what is typed and what arrives in the URL. */
const normalize = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

const routeApi = getRouteApi("/app/pair");

export default function PairDevicePage() {
  const { t } = useT();
  const { code: fromLink } = routeApi.useSearch();

  const [code, setCode] = useState(() => normalize(fromLink ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** Where this device goes once it is done here. Set only when the install
   *  step is worth showing — otherwise pairing navigates straight away. */
  const [table, setTable] = useState<{ id: number; href: string } | null>(null);

  const install = useInstallPrompt();

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
    const href = `/app/${result.clubSlug}/tables/${result.tableId}`;

    if (!canOfferInstall(install)) {
      pinKioskAndOpen(result.tableId, href);
      return;
    }

    setPending(false);
    setTable({ id: result.tableId, href });
  };

  const openTable = () => table && pinKioskAndOpen(table.id, table.href);

  if (table) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-4 py-8">
        <Card className="w-full space-y-5 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pot/15 text-pot">
              <LuCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-h3 font-semibold text-ink">
                {t("pair.paired")}
              </h1>
              <p className="text-caption text-ink-faint">
                {t("installPrompt.title")}
              </p>
            </div>
          </div>

          <p className="text-body text-ink-soft">
            {install.isIOS ? (
              <>
                {t("installPrompt.iosBody")}{" "}
                <LuShare2 className="inline h-4 w-4 align-[-3px]" aria-hidden />
              </>
            ) : (
              t("pair.installBody")
            )}
          </p>

          {/* iOS has no programmatic Add to Home Screen — the Share-sheet line
              above is all there is to offer, and the tablet leaves by the same
              button either way. Installing does not navigate on its own: on
              Android the install opens the app fresh, and this window is still
              the one holding the pairing that has to be pinned. */}
          {!install.isIOS && (
            <Button
              className="w-full"
              onClick={() => void install.promptInstall()}
            >
              {t("installPrompt.install")}
            </Button>
          )}

          <Button
            variant={install.isIOS ? "primary" : "secondary"}
            className="w-full"
            onClick={openTable}
          >
            {t("pair.openTable")}
          </Button>
        </Card>
      </div>
    );
  }

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
              onChange={(e) => setCode(normalize(e.target.value))}
              autoFocus={code.length !== 6}
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
