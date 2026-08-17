import { useState } from "react";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import type { Player, TournamentMatch } from "@/types";
import { useT } from "@/i18n";

/**
 * Filing a result by naming who played, rather than by finding a row in a
 * schedule.
 *
 * Nobody in a club league plays on the day a generated calendar says they will
 * — two people meet when they both happen to be at the table. So the fixture is
 * looked up from the pair, not the other way round, and a pairing with nothing
 * outstanding is refused rather than silently recorded against the wrong match.
 *
 * Prefilled when the caller already knows the fixture (a tap on the bracket),
 * empty when it does not. Either way the pair is what decides which match this
 * result lands on.
 */
export default function PlayGameForm({
  entrants,
  initialMatch,
  findMatch,
  raceFor,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  entrants: Player[];
  initialMatch?: TournamentMatch | null;
  /** The outstanding fixture between two players, if there is one. */
  findMatch: (a: number, b: number) => TournamentMatch | undefined;
  /** How many racks this particular fixture is played to. */
  raceFor: (match: TournamentMatch) => number;
  onSubmit: (values: {
    match: TournamentMatch;
    p1: Player;
    p2: Player;
    p1Score: number;
    p2Score: number;
  }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const { t } = useT();
  const [p1Id, setP1Id] = useState(String(initialMatch?.p1_id ?? ""));
  const [p2Id, setP2Id] = useState(String(initialMatch?.p2_id ?? ""));
  const [p1Score, setP1Score] = useState("");
  const [p2Score, setP2Score] = useState("");

  const p1 = entrants.find((p) => String(p.id) === p1Id);
  const p2 = entrants.find((p) => String(p.id) === p2Id);

  const samePlayer = !!p1 && p1.id === p2?.id;
  const match = p1 && p2 && !samePlayer ? findMatch(p1.id, p2.id) : undefined;
  const noFixture = !!p1 && !!p2 && !samePlayer && !match;

  const a = Number(p1Score);
  const b = Number(p2Score);
  const scored = p1Score !== "" && p2Score !== "" && a >= 0 && b >= 0;
  const tie = scored && a === b;

  // A race is won by getting there: the winner's score is the race, not merely
  // the larger number. Anything else is a scoreline this tournament cannot have
  // produced, and it would go on to skew the club ranking as a real result.
  const race = match ? raceFor(match) : null;
  const short = scored && !tie && race !== null && Math.max(a, b) !== race;
  const valid = !!match && scored && !tie && !short;

  const picker = (
    id: string,
    value: string,
    set: (value: string) => void,
    label: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        value={value}
        onChange={(e) => set(e.target.value)}
        disabled={isSubmitting}
        required
      >
        <option value="">{t("common.select")}</option>
        {entrants.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}
          </option>
        ))}
      </Select>
    </div>
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({ match: match!, p1: p1!, p2: p2!, p1Score: a, p2Score: b });
      }}
    >
      <div>
        <h2 className="text-h3 font-semibold text-ink">
          {t("tournaments.record")}
        </h2>
        {race !== null && (
          <p className="text-caption text-ink-faint">
            {t("tournaments.raceLabel", { n: race })}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {picker("game-p1", p1Id, setP1Id, t("tournaments.playerOne"))}
        {picker("game-p2", p2Id, setP2Id, t("tournaments.playerTwo"))}
      </div>

      {samePlayer && (
        <p className="text-caption text-strike">
          {t("tournaments.samePlayer")}
        </p>
      )}
      {noFixture && (
        <p className="text-caption text-strike">{t("tournaments.noFixture")}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="game-s1">{p1?.name ?? t("tournaments.racks")}</Label>
          <Input
            id="game-s1"
            type="number"
            inputMode="numeric"
            min={0}
            value={p1Score}
            onChange={(e) => setP1Score(e.target.value)}
            className="font-mono"
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="game-s2">{p2?.name ?? t("tournaments.racks")}</Label>
          <Input
            id="game-s2"
            type="number"
            inputMode="numeric"
            min={0}
            value={p2Score}
            onChange={(e) => setP2Score(e.target.value)}
            className="font-mono"
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      {tie && <p className="text-caption text-strike">{t("games.tie")}</p>}
      {short && race !== null && (
        <p className="text-caption text-strike">
          {t("tournaments.raceNeeded", { n: race })}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={!valid || isSubmitting}>
          {isSubmitting ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
