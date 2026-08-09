import { useState } from "react";
import { LuMessageSquare, LuSmilePlus, LuX } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import {
  matchesTarget,
  useComments,
  useReactions,
  useSocialActions,
} from "@/hooks/useSocial";
import { Input } from "@/components/ui/Input";
import { REACTIONS, type SocialTarget } from "@/types";
import { useT } from "@/i18n";

/**
 * Reactions and comments on one result — a match or a drill log.
 *
 * Deliberately quiet: a bare row of counts until you touch it, so a page of
 * scores still reads as scores. The thread only exists once someone opens it.
 */
export default function SocialBar({
  target,
  preview = false,
}: {
  target: SocialTarget;
  /** Feed cards show the first comment without a tap — a thread nobody can see
   *  is a thread nobody joins. */
  preview?: boolean;
}) {
  const { t, locale } = useT();
  const { player, isClubAdmin } = useAuth();
  const { data: players } = useGetPlayers();
  const { data: allComments } = useComments();
  const { data: allReactions } = useReactions();
  const { addComment, deleteComment, toggleReaction } = useSocialActions();

  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState("");

  const comments = (allComments ?? []).filter((c) => matchesTarget(c, target));
  const reactions = (allReactions ?? []).filter((r) => matchesTarget(r, target));

  const nameOf = (playerId: number) =>
    players?.find((p) => p.id === playerId)?.name ?? "—";

  const timeFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Only emoji anyone has actually used get a pill; the rest live behind the
  // picker so the row stays short. Read off the rows rather than the palette,
  // so an emoji added to the picker later still shows on old reactions.
  const used = [...new Set(reactions.map((r) => r.emoji))].sort(
    (a, b) =>
      (REACTIONS.indexOf(a as never) + 1 || 99) -
      (REACTIONS.indexOf(b as never) + 1 || 99),
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    addComment.mutate(
      { target, body: draft },
      { onSuccess: () => setDraft("") },
    );
  };

  const pill =
    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-body transition-colors duration-150";

  return (
    <div className="mt-1 px-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {used.map((emoji) => {
          const forEmoji = reactions.filter((r) => r.emoji === emoji);
          const mine = forEmoji.some((r) => r.author_player_id === player?.id);
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => toggleReaction.mutate({ target, emoji })}
              aria-pressed={mine}
              title={forEmoji.map((r) => nameOf(r.author_player_id)).join(", ")}
              className={`${pill} ${
                mine
                  ? "border-strike bg-strike-tint text-ink"
                  : "border-hairline text-ink-soft hover:border-hairline-strong"
              }`}
            >
              <span aria-hidden className="text-h4 leading-none">
                {emoji}
              </span>
              <span className="font-mono text-caption tabular-nums">
                {forEmoji.length}
              </span>
            </button>
          );
        })}

        {picking ? (
          <span className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-hairline px-1 py-0.5">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={emoji}
                className="h-9 w-9 rounded-full text-h4 hover:bg-felt-raised"
                onClick={() => {
                  toggleReaction.mutate({ target, emoji });
                  setPicking(false);
                }}
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              aria-label={t("common.cancel")}
              className="h-9 w-9 rounded-full text-ink-faint hover:bg-felt-raised"
              onClick={() => setPicking(false)}
            >
              <LuX className="mx-auto h-4 w-4" />
            </button>
          </span>
        ) : (
          <button
            type="button"
            aria-label={t("social.react")}
            onClick={() => setPicking(true)}
            className={`${pill} border-hairline text-ink-faint hover:border-hairline-strong hover:text-ink-soft`}
          >
            <LuSmilePlus className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`${pill} border-hairline text-ink-faint hover:border-hairline-strong hover:text-ink-soft`}
        >
          <LuMessageSquare className="h-4 w-4" />
          {comments.length > 0 && (
            <span className="font-mono text-caption tabular-nums">
              {comments.length}
            </span>
          )}
        </button>
      </div>

      {preview && !open && comments.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1.5 block w-full text-left"
        >
          <span className="line-clamp-2 text-body text-ink-faint">
            <span className="font-medium text-ink-soft">
              {nameOf(comments[0].author_player_id)}
            </span>{" "}
            {comments[0].body}
          </span>
        </button>
      )}

      {open && (
        <div className="mt-2 space-y-3 border-l border-hairline pl-3">
          {comments.length === 0 && (
            <p className="text-body text-ink-ghost">{t("social.empty")}</p>
          )}

          {comments.map((c) => (
            <div key={c.id} className="group flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-caption text-ink-faint">
                  <span className="font-medium text-ink-soft">
                    {nameOf(c.author_player_id)}
                  </span>{" "}
                  <time dateTime={c.created_at}>
                    {timeFmt.format(new Date(c.created_at))}
                  </time>
                </p>
                <p className="whitespace-pre-wrap break-words text-body text-ink">
                  {c.body}
                </p>
              </div>
              {(c.author_player_id === player?.id || isClubAdmin) && (
                <button
                  type="button"
                  aria-label={t("common.delete")}
                  onClick={() => deleteComment.mutate(c.id)}
                  className="shrink-0 p-1 text-ink-ghost hover:text-strike"
                >
                  <LuX className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          <form onSubmit={submit} className="flex gap-2 pt-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              placeholder={t("social.write")}
              className="h-9"
            />
            <button
              type="submit"
              disabled={!draft.trim() || addComment.isPending}
              className="h-9 shrink-0 rounded-control px-3 text-body font-medium text-strike disabled:text-ink-ghost"
            >
              {t("social.send")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
